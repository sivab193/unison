import type { ParseMeta, Play } from './types'
import type { TextExportFile } from './apple'

interface YoutubeJsonRecord {
  header?: string
  title?: string
  titleUrl?: string
  time?: string
  subtitles?: { name?: string; url?: string }[]
}

const MONTHS = new Map(
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (month, index) => [month, index],
  ),
)
const pad = (value: number) => String(value).padStart(2, '0')

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, '')).replace(/[\u202f\u00a0]/g, ' ').trim()
}

function parseTakeoutDate(raw: string): Date | null {
  const clean = stripTags(raw).replace(/\s+[A-Z]{2,5}$/, '')
  const match = clean.match(
    /^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+([AP]M)$/,
  )
  if (match) {
    const month = MONTHS.get(match[1])
    if (month !== undefined) {
      let hour = Number(match[4]) % 12
      if (match[7] === 'PM') hour += 12
      const date = new Date(Number(match[3]), month, Number(match[2]), hour, Number(match[5]), Number(match[6]))
      return Number.isFinite(date.getTime()) ? date : null
    }
  }
  const fallback = new Date(stripTags(raw))
  return Number.isFinite(fallback.getTime()) ? fallback : null
}

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

function videoId(url: string): string {
  const match = url.match(/[?&]v=([^&]+)/) ?? url.match(/youtu\.be\/([^?&/]+)/)
  return match?.[1] ?? url
}

function splitArtistAndTrack(rawTitle: string, rawChannel: string): { artist: string; track: string } {
  const title = rawTitle.replace(/^Watched\s+/i, '').trim() || 'Unavailable video'
  const channel = rawChannel.trim()
  if (/\s+-\s+Topic$/i.test(channel)) {
    return { artist: channel.replace(/\s+-\s+Topic$/i, '').trim(), track: title }
  }
  const split = title.match(/^(.+?)\s+[–—-]\s+(.+)$/)
  if (split) return { artist: split[1].trim(), track: split[2].trim() }
  if (channel) return { artist: channel, track: title }
  return { artist: 'Unknown Artist', track: title }
}

function makePlay(rawTitle: string, channel: string, url: string, rawDate: string): Play | null {
  const date = parseTakeoutDate(rawDate)
  if (!date) return null
  const { artist, track } = splitArtistAndTrack(rawTitle, channel)
  const key = url ? videoId(url) : `${artist}|${track}`.toLowerCase()
  return {
    ...stamp(date),
    ms: null,
    uri: `youtube:${key}`,
    track,
    artist,
    album: '',
    platform: '',
    country: '',
    skip: false,
    shuffle: false,
    offline: false,
  }
}

function parseHtml(text: string): Play[] {
  const chunks = text.split(/<div class="outer-cell[^>]*>/i).slice(1)
  const plays: Play[] = []
  for (const chunk of chunks) {
    if (!/<p class="mdl-typography--title">\s*YouTube Music\s*<br>/i.test(chunk)) continue
    const body = chunk.match(
      /<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">([\s\S]*?)<\/div>/i,
    )?.[1]
    if (!body) continue
    const parts = body.split(/<br\s*\/?>/i)
    const links = [...body.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
    const title = links[0] ? stripTags(links[0][2]) : stripTags(parts[0]).replace(/^Watched\s+/i, '')
    const url = links[0]?.[1] ? decodeHtml(links[0][1]) : ''
    const channel = links[1] ? stripTags(links[1][2]) : ''
    const datePart = parts.find((part, index) => index > 0 && /\d{4}/.test(stripTags(part))) ?? ''
    const play = makePlay(title, channel, url, datePart)
    if (play) plays.push(play)
  }
  return plays
}

function parseJson(text: string): Play[] {
  const records = JSON.parse(text) as YoutubeJsonRecord[]
  if (!Array.isArray(records)) return []
  return records
    .filter((record) => record.header === 'YouTube Music')
    .map((record) =>
      makePlay(
        record.title ?? '',
        record.subtitles?.[0]?.name ?? '',
        record.titleUrl ?? '',
        record.time ?? '',
      ),
    )
    .filter((play): play is Play => play !== null)
}

export function parseYoutubeFiles(files: TextExportFile[]): { plays: Play[]; meta: ParseMeta } {
  const plays = files.flatMap((file) =>
    file.name.toLowerCase().endsWith('.html') ? parseHtml(file.text) : parseJson(file.text),
  )
  plays.sort((a, b) => a.t - b.t)
  const years = [...new Set(plays.map((play) => play.year))].sort((a, b) => a - b)
  return {
    plays,
    meta: {
      source: 'youtube',
      years,
      platforms: [],
      totalPlays: plays.length,
      format: 'youtube',
      durationKnown: false,
      approximateTimes: false,
    },
  }
}
