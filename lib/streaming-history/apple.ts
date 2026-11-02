import Papa from 'papaparse'
import type { HistoryFormat, ParseMeta, Play } from './types'

export interface TextExportFile {
  name: string
  text: string
}

type CsvRow = Record<string, string | undefined>

const pad = (value: number) => String(value).padStart(2, '0')

function stamp(date: Date) {
  const year = date.getFullYear()
  return {
    t: date.getTime(),
    year,
    month: `${year}-${pad(date.getMonth() + 1)}`,
    day: `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    hour: date.getHours(),
    dow: date.getDay(),
  }
}

function normalizedKey(value: string): string {
  return value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeRow(row: CsvRow): CsvRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizedKey(key), value]))
}

function read(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[normalizedKey(key)]?.trim()
    if (value) return value
  }
  return ''
}

function numberValue(row: CsvRow, ...keys: string[]): number | null {
  const raw = read(row, ...keys).replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function parseDate(raw: string): Date | null {
  if (!raw) return null
  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date : null
}

function parseCsv(text: string): CsvRow[] {
  const result = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })
  return result.data.map(normalizeRow)
}

function identity(artist: string, track: string, album: string): string {
  return `apple:${artist.toLowerCase()}|${track.toLowerCase()}|${album.toLowerCase()}`
}

function activityPlay(row: CsvRow): Play | null {
  const track = read(row, 'Song Name', 'Track Name', 'Track Description', 'Title')
  const artist = read(row, 'Artist Name', 'Artist') || 'Unknown Artist'
  const album = read(row, 'Album Name', 'Container Description', 'Album')
  const date = parseDate(
    read(
      row,
      'Event Start Timestamp',
      'Event End Timestamp',
      'Play Date UTC',
      'Date Played',
      'Timestamp',
    ),
  )
  if (!track || !date) return null

  const ms = numberValue(
    row,
    'Play Duration Milliseconds',
    'Playback Duration Milliseconds',
    'Play Duration',
  )
  const device = read(row, 'Device Name', 'Device Type', 'Client Build Type', 'Source Type')
  const country = read(row, 'Country Code', 'Storefront Country Name', 'Country')
  const skipValue = read(row, 'Skip Count', 'Skipped', 'End Reason Type').toLowerCase()

  return {
    ...stamp(date),
    ms: ms !== null && ms >= 0 ? ms : null,
    uri: identity(artist, track, album),
    track,
    artist,
    album,
    platform: device,
    country,
    skip: (ms !== null && ms < 30_000) || /skip/.test(skipValue),
    shuffle: /true|yes|1/.test(read(row, 'Shuffle').toLowerCase()),
    offline: /true|yes|1/.test(read(row, 'Offline').toLowerCase()),
  }
}

function dailyPlays(row: CsvRow): Play[] {
  const track = read(row, 'Song Name', 'Track Name', 'Track Description', 'Title')
  const artist = read(row, 'Artist Name', 'Artist') || 'Unknown Artist'
  const album = read(row, 'Album Name', 'Album')
  const baseDate = parseDate(read(row, 'Date Played', 'Play Date', 'Date', 'Event Date'))
  const count = Math.max(1, Math.round(numberValue(row, 'Play Count', 'Plays') ?? 1))
  if (!track || !baseDate) return []

  const totalMs = numberValue(
    row,
    'Total Play Duration Milliseconds',
    'Play Duration Milliseconds',
    'Total Time Played',
  )
  const perPlayMs = totalMs !== null ? Math.max(0, Math.round(totalMs / count)) : null
  const hours = read(row, 'Hours', 'Hours Played', 'Hour')
    .split(/[^0-9]+/)
    .map(Number)
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(baseDate)
    const hour = hours[index % Math.max(1, hours.length)] ?? Math.floor((index * 24) / count)
    date.setHours(hour, Math.floor(((index % 6) * 60) / 6), 0, 0)
    return {
      ...stamp(date),
      ms: perPlayMs,
      uri: identity(artist, track, album),
      track,
      artist,
      album,
      platform: '',
      country: '',
      skip: false,
      shuffle: false,
      offline: false,
    }
  })
}

function classify(name: string): HistoryFormat | null {
  const base = name.split('/').pop()?.toLowerCase() ?? name.toLowerCase()
  if (base.includes('apple music - play activity')) return 'apple-activity'
  if (base.includes('apple music - play history daily tracks')) return 'apple-daily'
  if (base.includes('apple music - recently played tracks')) return 'apple-recent'
  return null
}

export function parseAppleFiles(files: TextExportFile[]): { plays: Play[]; meta: ParseMeta } {
  const ranked: HistoryFormat[] = ['apple-activity', 'apple-daily', 'apple-recent']
  const format = ranked.find((candidate) => files.some((file) => classify(file.name) === candidate))
  if (!format) throw new Error('No Apple Music play-history CSV was found in that ZIP.')

  const rows = files
    .filter((file) => classify(file.name) === format)
    .flatMap((file) => parseCsv(file.text))
  const plays =
    format === 'apple-daily'
      ? rows.flatMap(dailyPlays)
      : rows.map(activityPlay).filter((play): play is Play => play !== null)

  plays.sort((a, b) => a.t - b.t)
  const years = [...new Set(plays.map((play) => play.year))].sort((a, b) => a - b)
  const platforms = [...new Set(plays.map((play) => play.platform).filter(Boolean))].sort()

  return {
    plays,
    meta: {
      source: 'apple',
      sources: ['apple'],
      years,
      platforms,
      totalPlays: plays.length,
      format,
      durationKnown: plays.some((play) => play.ms !== null),
      approximateTimes: format === 'apple-daily',
    },
  }
}
