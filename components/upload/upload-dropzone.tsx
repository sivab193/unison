'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadCloud, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import type {
  DataPlatform,
  ParseMeta,
  Play,
  WorkerResponse,
} from '@/lib/streaming-history/types'

type Phase =
  | { status: 'idle' }
  | { status: 'working'; stage: string; percent: number }
  | { status: 'error'; message: string }

export function UploadDropzone({
  onReady,
  source,
}: {
  onReady: (plays: Play[], meta: ParseMeta) => void
  source: DataPlatform
}) {
  const [phase, setPhase] = useState<Phase>({ status: 'idle' })
  const [dragging, setDragging] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const process = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const accepted = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.zip'))
      if (accepted.length === 0) {
        setPhase({ status: 'error', message: 'Choose the original ZIP from your music service.' })
        return
      }

      setPhase({ status: 'working', stage: 'Reading files…', percent: 5 })
      try {
        const files = await Promise.all(
          accepted.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })),
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
          setPhase({ status: 'error', message: 'Something went wrong reading that file.' })
        }

        worker.postMessage(
          { files, source },
          files.map((f) => f.buffer),
        )
      } catch {
        setPhase({ status: 'error', message: 'Could not read that file.' })
      }
    },
    [onReady, source],
  )

  const working = phase.status === 'working'

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!working) process(e.dataTransfer.files)
        }}
        className={`group flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60 hover:bg-card/60'
        } ${working ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          multiple
          className="sr-only"
          disabled={working}
          onChange={(e) => process(e.target.files)}
        />

        {working ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-2 w-full max-w-xs">
              <p className="text-sm font-medium">{phase.stage}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${phase.percent}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Drop your {source === 'youtube' ? 'YouTube Music' : source === 'apple' ? 'Apple Music' : 'Spotify'} ZIPs here</p>
              <p className="text-sm text-muted-foreground">
                One or more original archives — overlapping plays are merged automatically
              </p>
            </div>
            <Button type="button" size="lg" onClick={() => inputRef.current?.click()}>
              Choose ZIPs
            </Button>
          </>
        )}
      </label>

      {phase.status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{phase.message}</span>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Combined and parsed entirely in your browser — nothing is uploaded to any server.
      </p>
    </div>
  )
}
