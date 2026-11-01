/// <reference lib="webworker" />
// Reads platform export ZIPs entirely inside a browser worker. No file bytes,
// track names, or aggregate results leave the device.
import { unzipSync, strFromU8 } from 'fflate'
import { dedupePlays, normalize } from './aggregate'
import { parseAppleFiles, type TextExportFile } from './apple'
import { parseYoutubeFiles } from './youtube'
import type {
  DataPlatform,
  RawBasicPlay,
  RawPlay,
  WorkerRequest,
  WorkerResponse,
} from './types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

function post(message: WorkerResponse) {
  ctx.postMessage(message)
}

function baseName(name: string): string {
  return name.split('/').pop() ?? name
}

function isExtendedHistory(name: string): boolean {
  return /streaming_history_audio.*\.json$/i.test(baseName(name))
}

function isBasicHistory(name: string): boolean {
  const base = baseName(name)
  return !/podcast/i.test(base) && /^streaminghistory(_music)?_?\d*\.json$/i.test(base)
}

function isAppleHistory(name: string): boolean {
  return /apple music - (play activity|play history daily tracks|recently played tracks).*\.csv$/i.test(
    baseName(name),
  )
}

function isYoutubeHistory(name: string): boolean {
  const normalized = name.replace(/\\/g, '/')
  return (
    /youtube and youtube music/i.test(normalized) &&
    /^watch-history\.(json|html)$/i.test(baseName(normalized))
  )
}

function wanted(name: string, source: DataPlatform): boolean {
  if (/\.zip$/i.test(name)) return source === 'apple'
  if (source === 'spotify') return isExtendedHistory(name) || isBasicHistory(name)
  if (source === 'apple') return isAppleHistory(name)
  return isYoutubeHistory(name)
}

function collectZipEntries(
  bytes: Uint8Array,
  source: DataPlatform,
  out: { name: string; bytes: Uint8Array }[],
  depth = 0,
) {
  const entries = unzipSync(bytes, { filter: (entry) => wanted(entry.name, source) })
  for (const [name, data] of Object.entries(entries)) {
    if (!data.length) continue
    if (/\.zip$/i.test(name) && depth < 3) collectZipEntries(data, source, out, depth + 1)
    else out.push({ name, bytes: data })
  }
}

function parseSpotify(entries: { name: string; bytes: Uint8Array }[]) {
  const extended = entries.filter((entry) => isExtendedHistory(entry.name))
  const basic = entries.filter((entry) => isBasicHistory(entry.name))
  const selected = extended.length ? extended : basic
  if (!selected.length) {
    throw new Error(
      'No Spotify streaming history was found. Choose the ZIP containing Streaming_History_Audio_*.json or StreamingHistory_music_*.json.',
    )
  }

  const rows: (RawPlay | RawBasicPlay)[] = []
  for (const entry of selected) {
    const parsed = JSON.parse(strFromU8(entry.bytes))
    if (Array.isArray(parsed)) rows.push(...parsed)
  }
  return normalize(
    rows as RawPlay[] | RawBasicPlay[],
    extended.length ? 'spotify-extended' : 'spotify-basic',
  )
}

function toTextFiles(entries: { name: string; bytes: Uint8Array }[]): TextExportFile[] {
  return entries.map((entry) => ({ name: entry.name, text: strFromU8(entry.bytes) }))
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const { files, source } = event.data
    const entries: { name: string; bytes: Uint8Array }[] = []

    files.forEach((file, index) => {
      post({ type: 'progress', stage: 'Opening your export…', percent: 10 })
      collectZipEntries(new Uint8Array(file.buffer), source, entries)
      post({
        type: 'progress',
        stage: 'Finding listening history…',
        percent: 20 + Math.round(((index + 1) / files.length) * 30),
      })
    })

    post({ type: 'progress', stage: 'Parsing plays…', percent: 60 })
    const result =
      source === 'spotify'
        ? parseSpotify(entries)
        : source === 'apple'
          ? parseAppleFiles(toTextFiles(entries))
          : parseYoutubeFiles(toTextFiles(entries))

    const plays = dedupePlays(result.plays)
    if (!plays.length) {
      const message =
        source === 'youtube'
          ? 'No YouTube Music plays were found. Use the Google Takeout ZIP containing YouTube and YouTube Music watch history.'
          : source === 'apple'
            ? 'No Apple Music plays were found in that export.'
            : 'No music plays were found in that Spotify export.'
      post({ type: 'error', message })
      return
    }

    const meta = {
      ...result.meta,
      years: [...new Set(plays.map((play) => play.year))].sort((a, b) => a - b),
      platforms: [...new Set(plays.map((play) => play.platform).filter(Boolean))].sort(),
      totalPlays: plays.length,
      durationKnown: plays.some((play) => play.ms !== null),
    }

    post({ type: 'progress', stage: 'Merging archives and crunching your listening…', percent: 88 })
    post({ type: 'done', plays, meta })
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : 'Could not read that export ZIP.',
    })
  }
}
