'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  DataPlatform,
  ParseMeta,
  Play,
  WorkerResponse,
} from '@/lib/streaming-history/types'

const SOURCE_LABELS: Record<DataPlatform, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube Music',
}

type Phase =
  | { status: 'idle' }
  | { status: 'working'; stage: string; percent: number }
  | { status: 'error'; message: string }

export function UploadDropzone({
  onReady,
  sources,
}: {
  onReady: (plays: Play[], meta: ParseMeta) => void
  sources: DataPlatform[]
}) {
  const [phase, setPhase] = useState<Phase>({ status: 'idle' })
  const [filesBySource, setFilesBySource] = useState<Partial<Record<DataPlatform, File[]>>>({})
  const [dragging, setDragging] = useState<DataPlatform | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const inputRefs = useRef<Partial<Record<DataPlatform, HTMLInputElement | null>>>({})

  useEffect(() => () => workerRef.current?.terminate(), [])

  const addFiles = useCallback((source: DataPlatform, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const accepted = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith('.zip'))
    if (accepted.length === 0) {
      setPhase({ status: 'error', message: 'Choose the original ZIP from your music service.' })
      return
    }

    setFilesBySource((current) => ({
      ...current,
      [source]: [...(current[source] ?? []), ...accepted],
    }))
    setPhase({ status: 'idle' })
  }, [])

  const removeFile = (source: DataPlatform, fileIndex: number) => {
    setFilesBySource((current) => ({
      ...current,
      [source]: (current[source] ?? []).filter((_, index) => index !== fileIndex),
    }))
  }

  const process = useCallback(async () => {
    if (sources.length === 0) {
      setPhase({ status: 'error', message: 'Choose at least one music service to continue.' })
      return
    }

    const missing = sources.filter((source) => !filesBySource[source]?.length)
    if (missing.length) {
      setPhase({
        status: 'error',
        message: `Attach at least one ZIP for ${missing.map((source) => SOURCE_LABELS[source]).join(', ')}.`,
      })
      return
    }

    setPhase({ status: 'working', stage: 'Reading files…', percent: 5 })
    try {
      const files = await Promise.all(
        sources.flatMap((source) =>
          (filesBySource[source] ?? []).map(async (file) => ({
            name: file.name,
            source,
            buffer: await file.arrayBuffer(),
          })),
        ),
      )

      workerRef.current?.terminate()
      const worker = new Worker(new URL('../../lib/streaming-history/worker.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current = worker

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data
        if (msg.type === 'progress') {
          setPhase({ status: 'working', stage: msg.stage, percent: msg.percent })
        } else if (msg.type === 'done') {
          setPhase({ status: 'idle' })
          worker.terminate()
          onReady(msg.plays, msg.meta)
        } else {
          setPhase({ status: 'error', message: msg.message })
          worker.terminate()
        }
      }
      worker.onerror = () => {
        setPhase({ status: 'error', message: 'Something went wrong reading those files.' })
        worker.terminate()
      }

      worker.postMessage(
        { files },
        files.map((file) => file.buffer),
      )
    } catch {
      setPhase({ status: 'error', message: 'Could not read those files.' })
    }
  }, [filesBySource, onReady, sources])

  const working = phase.status === 'working'
  const selectedFileCount = sources.reduce(
    (total, source) => total + (filesBySource[source]?.length ?? 0),
    0,
  )

  return (
    <div className="w-full space-y-4">
      {sources.length === 0 ? (
        <p className="rounded-xl bg-card px-5 py-6 text-center text-sm text-muted-foreground">
          Select one or more services above, then attach their export ZIPs.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sources.map((source) => (
            <section
              key={source}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(source)
              }}
              onDragLeave={() => setDragging(null)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(null)
                if (!working) addFiles(source, event.dataTransfer.files)
              }}
              className={`space-y-3 rounded-xl border-2 border-dashed p-4 transition-colors ${
                dragging === source
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card/60'
              }`}
            >
              <input
                ref={(element) => {
                  inputRefs.current[source] = element
                }}
                type="file"
                accept=".zip,application/zip"
                multiple
                className="sr-only"
                disabled={working}
                onChange={(event) => {
                  addFiles(source, event.target.files)
                  event.target.value = ''
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{SOURCE_LABELS[source]}</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={working}
                  onClick={() => inputRefs.current[source]?.click()}
                >
                  <UploadCloud className="h-4 w-4" /> Attach ZIPs
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Drop one or more {SOURCE_LABELS[source]} export ZIPs here.
              </p>
              {(filesBySource[source] ?? []).length > 0 && (
                <ul className="space-y-2" aria-label={`${SOURCE_LABELS[source]} files`}>
                  {(filesBySource[source] ?? []).map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        disabled={working}
                        onClick={() => removeFile(source, index)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {working ? (
        <div className="space-y-2 rounded-xl bg-card p-4 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium">{phase.stage}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${phase.percent}%` }}
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={sources.length === 0 || selectedFileCount === 0}
          onClick={process}
        >
          Process {selectedFileCount || ''} export ZIP{selectedFileCount === 1 ? '' : 's'}
        </Button>
      )}

      {phase.status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{phase.message}</span>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
        Combined and parsed entirely in your browser — nothing is uploaded to any server.
      </p>
    </div>
  )
}
