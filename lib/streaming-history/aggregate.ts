// Pure functions over the common browser-normalized play shape. `normalize`
// handles Spotify rows; the Apple and YouTube parsers produce the same Play[]
// contract before aggregation.
import type {
  AlbumAgg,
  ArtistAgg,
  ArtistYear,
  HistoryFormat,
  HourBin,
  LabelledAgg,
  LocalStats,
  ParseMeta,
  Play,
  PlayFilters,
  RawBasicPlay,
  RawPlay,
  RideOrDie,
  TrackAgg,
} from './types'

/** Below this, a play reads as a skip regardless of the `skipped` flag. */
const SKIP_MS = 30_000

/** A quiet stretch longer than this ends a listening session. */
const SESSION_GAP_MS = 30 * 60_000

/** How deep into each year's artist chart a "ride or die" has to stay. */
const LOYALTY_DEPTH = 20

function peakHourPersona(hour: number): string {
  if (hour >= 22 || hour < 5) return 'Night Owl'
  if (hour < 9) return 'Early Bird'
  if (hour < 17) return 'Daytime Groover'
  return 'Evening Unwinder'
}

function prettyPlatform(raw: string | null): string {
  if (!raw || raw.toLowerCase() === 'not_applicable') return 'Other'
  const p = raw.toLowerCase()
  if (p.includes('android')) return 'Android'
  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return 'iOS'
  if (p.includes('osx') || p.includes('mac')) return 'macOS'
  if (p.includes('windows') || p.includes('win32') || p.includes('win64')) return 'Windows'
  if (p.includes('web') || p.includes('webplayer')) return 'Web Player'
  if (p.includes('cast') || p.includes('chromecast')) return 'Chromecast'
  if (p.includes('sonos')) return 'Sonos'
  if (p.includes('tizen') || p.includes('samsung')) return 'Samsung TV'
  if (p.includes('linux')) return 'Linux'
  if (p.includes('partner') || p.includes('tv')) return 'TV / Partner'
  return raw
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

/** The date/time fields every play carries, derived once from its timestamp. */
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

function fromExtendedRow(row: RawPlay): Play | null {
  if (!row.spotify_track_uri) return null // podcast / audiobook rows
  const ms = row.ms_played ?? 0
  if (ms <= 0) return null
  const date = new Date(row.ts)
  if (!Number.isFinite(date.getTime())) return null

  return {
    ...stamp(date),
    ms,
    uri: row.spotify_track_uri,
    track: row.master_metadata_track_name ?? 'Unknown Track',
    artist: row.master_metadata_album_artist_name ?? 'Unknown Artist',
    album: row.master_metadata_album_album_name ?? '',
    platform: prettyPlatform(row.platform),
    country: row.conn_country ?? 'Unknown',
    skip: row.skipped === true || ms < SKIP_MS,
    shuffle: row.shuffle === true,
    offline: row.offline === true,
  }
}

function fromBasicRow(row: RawBasicPlay): Play | null {
  const ms = row.msPlayed ?? 0
  if (ms <= 0 || !row.trackName) return null
  // "2025-05-07 09:21" is UTC but isn't ISO, so browsers would read it as local
  // time. Pin it to UTC, then the local getters below match the extended path.
  const date = new Date(`${row.endTime.replace(' ', 'T')}:00Z`)
  if (!Number.isFinite(date.getTime())) return null

  const artist = row.artistName ?? 'Unknown Artist'
  return {
    ...stamp(date),
    ms,
    // No track URI in this export — artist + title is the only stable identity.
    uri: `basic:${artist}|${row.trackName}`,
    track: row.trackName,
    artist,
    // Album, device, country and the shuffle flag simply aren't recorded here.
    album: '',
    platform: '',
    country: '',
    skip: ms < SKIP_MS,
    shuffle: false,
    offline: false,
  }
}

/** Raw rows → compact plays (music only) + filter metadata. */
export function normalize(
  rows: RawPlay[] | RawBasicPlay[],
  format: HistoryFormat = 'spotify-extended',
): { plays: Play[]; meta: ParseMeta } {
  const plays: Play[] = []
  const years = new Set<number>()
  const platforms = new Set<string>()

  for (const row of rows) {
    const play =
      format === 'spotify-basic'
        ? fromBasicRow(row as RawBasicPlay)
        : fromExtendedRow(row as RawPlay)
    if (!play) continue

    years.add(play.year)
    if (play.platform) platforms.add(play.platform)
    plays.push(play)
  }

  // Chronological once, here, so every later pass (sessions, streaks) can
  // assume order without re-sorting on each filter change.
  plays.sort((a, b) => a.t - b.t)

  return {
    plays,
    meta: {
      source: 'spotify',
      sources: ['spotify'],
      years: [...years].sort((a, b) => a - b),
      platforms: [...platforms].sort(),
      totalPlays: plays.length,
      format,
      durationKnown: true,
      approximateTimes: false,
    },
  }
}

function topBy<T extends { ms: number }>(map: Map<string, T>, n: number): T[] {
  return [...map.values()].sort((a, b) => b.ms - a.ms).slice(0, n)
}

function topByMeasure<T extends { ms: number; plays: number }>(
  map: Map<string, T>,
  n: number,
  durationKnown: boolean,
): T[] {
  return [...map.values()]
    .sort((a, b) => (durationKnown ? b.ms - a.ms : b.plays - a.plays))
    .slice(0, n)
}

function matches(p: Play, f: PlayFilters): boolean {
  if (f.excludeSkips && p.skip) return false
  if (f.years && !f.years.includes(p.year)) return false
  if (f.platforms && !f.platforms.includes(p.platform)) return false
  return true
}

/**
 * Merge overlapping exports without counting the same recorded event twice.
 * Separate real plays of the same track remain distinct because their event
 * timestamps differ; repeated archive snapshots share this full signature.
 */
export function dedupePlays(plays: Play[]): Play[] {
  const seen = new Set<string>()
  const unique: Play[] = []
  for (const play of plays) {
    const signature = [
      play.t,
      play.uri,
      play.ms ?? 'unknown',
      play.track,
      play.artist,
      play.album,
    ].join('\u001f')
    if (seen.has(signature)) continue
    seen.add(signature)
    unique.push(play)
  }
  return unique.sort((a, b) => a.t - b.t)
}

export function aggregate(
  plays: Play[],
  filters: PlayFilters = { years: null, platforms: null, excludeSkips: false },
): LocalStats {
  const tracks = new Map<string, TrackAgg>()
  const artists = new Map<string, ArtistAgg & { _tracks: Set<string> }>()
  const albums = new Map<string, AlbumAgg>()
  const years = new Map<number, { minutes: number; plays: number }>()
  const months = new Map<string, number>()
  const platforms = new Map<string, LabelledAgg>()
  const countries = new Map<string, LabelledAgg>()
  const days = new Map<string, number>()
  const artistYear = new Map<string, ArtistYear>()
  const trackDay = new Map<string, number>() // uri|day -> plays
  const clock: HourBin[] = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }))
  const weekday = Array.from({ length: 7 }, (_, day) => ({ day, minutes: 0 }))
  const seasonal = Array.from({ length: 12 }, (_, month) => ({ month, minutes: 0 }))

  let totalPlays = 0
  let totalMs = 0
  let durationPlayCount = 0
  let skips = 0
  let shuffled = 0
  let offlinePlays = 0
  let weekendMinutes = 0
  let weekdayMinutes = 0
  let firstTs = Infinity
  let lastTs = -Infinity
  let firstEver: LocalStats['firstEver'] = null

  // Sessions — `plays` arrives chronological from normalize()
  let sessionCount = 0
  let sessionTracks = 0
  let sessionMs = 0
  let longestTracks = 0
  let longestMs = 0
  let prevTs = -Infinity
  const closeSession = () => {
    if (sessionTracks > longestTracks) {
      longestTracks = sessionTracks
      longestMs = sessionMs
    }
  }

  for (const p of plays) {
    if (!matches(p, filters)) continue
    const durationMs = p.ms ?? 0
    // Time buckets double as play-count buckets for sources with no duration.
    const minutes = p.ms === null ? 1 : durationMs / 60_000

    if (p.t - prevTs > SESSION_GAP_MS) {
      closeSession()
      sessionCount++
      sessionTracks = 0
      sessionMs = 0
    }
    prevTs = p.t
    sessionTracks++
    sessionMs += durationMs

    totalPlays++
    totalMs += durationMs
    if (p.ms !== null) durationPlayCount++
    if (p.skip) skips++
    if (p.shuffle) shuffled++
    if (p.offline) offlinePlays++
    if (p.t < firstTs) {
      firstTs = p.t
      firstEver = { track: p.track, artist: p.artist, ts: new Date(p.t).toISOString() }
    }
    if (p.t > lastTs) lastTs = p.t

    // Track
    const track = tracks.get(p.uri)
    if (track) {
      track.ms += durationMs
      track.plays++
      if (p.skip) track.skips++
    } else {
      tracks.set(p.uri, {
        uri: p.uri,
        name: p.track,
        artist: p.artist,
        album: p.album,
        ms: durationMs,
        plays: 1,
        skips: p.skip ? 1 : 0,
      })
    }

    // Artist
    const artist = artists.get(p.artist)
    if (artist) {
      artist.ms += durationMs
      artist.plays++
      artist._tracks.add(p.uri)
      if (p.year < artist.firstYear) artist.firstYear = p.year
    } else {
      artists.set(p.artist, {
        name: p.artist,
        ms: durationMs,
        plays: 1,
        distinctTracks: 0,
        firstYear: p.year,
        _tracks: new Set([p.uri]),
      })
    }

    // Album
    if (p.album) {
      const key = `${p.album} ${p.artist}`
      const album = albums.get(key)
      if (album) {
        album.ms += durationMs
        album.plays++
      } else {
        albums.set(key, { name: p.album, artist: p.artist, ms: durationMs, plays: 1 })
      }
    }

    // Time buckets
    const y = years.get(p.year)
    if (y) {
      y.minutes += minutes
      y.plays++
    } else {
      years.set(p.year, { minutes, plays: 1 })
    }
    months.set(p.month, (months.get(p.month) ?? 0) + minutes)
    clock[p.hour].minutes += minutes
    weekday[p.dow].minutes += minutes
    seasonal[parseInt(p.month.slice(5, 7), 10) - 1].minutes += minutes
    if (p.dow === 0 || p.dow === 6) weekendMinutes += minutes
    else weekdayMinutes += minutes
    days.set(p.day, (days.get(p.day) ?? 0) + minutes)

    // Top artist per year
    const ayKey = `${p.year}|${p.artist}`
    const ay = artistYear.get(ayKey)
    if (ay) {
      ay.minutes += minutes
      ay.plays++
    } else {
      artistYear.set(ayKey, { year: p.year, artist: p.artist, minutes, plays: 1 })
    }

    // On repeat (same track, same day)
    const tdKey = `${p.uri}|${p.day}`
    trackDay.set(tdKey, (trackDay.get(tdKey) ?? 0) + 1)

    // Categorical. The basic export records neither, leaving these blank — an
    // empty label would otherwise become one nameless row holding everything.
    if (p.platform) {
      const pf = platforms.get(p.platform)
      if (pf) {
        pf.minutes += minutes
        pf.plays++
      } else {
        platforms.set(p.platform, { label: p.platform, minutes, plays: 1 })
      }
    }
    if (p.country) {
      const c = countries.get(p.country)
      if (c) {
        c.minutes += minutes
        c.plays++
      } else {
        countries.set(p.country, { label: p.country, minutes, plays: 1 })
      }
    }
  }

  closeSession()
  for (const artist of artists.values()) artist.distinctTracks = artist._tracks.size
  const durationKnown = durationPlayCount > 0

  const peakHour = clock.reduce((max, b) => (b.minutes > max.minutes ? b : max), clock[0]).hour

  // Artist diversity: normalized Shannon entropy over listening time, so it
  // reads on the same 0–100 scale as the genre diversity on the API path.
  let artistDiversity = 0
  const diversityTotal = durationKnown ? totalMs : totalPlays
  if (artists.size > 1 && diversityTotal > 0) {
    const entropy = -[...artists.values()].reduce((sum, a) => {
      const share = (durationKnown ? a.ms : a.plays) / diversityTotal
      return share > 0 ? sum + share * Math.log(share) : sum
    }, 0)
    artistDiversity = Math.round((entropy / Math.log(artists.size)) * 100)
  }

  // Record day + on-repeat champion
  let recordDay: LocalStats['recordDay'] = null
  for (const [date, minutes] of days) {
    if (!recordDay || minutes > recordDay.minutes) recordDay = { date, minutes }
  }

  let onRepeat: LocalStats['onRepeat'] = null
  let repeatMax = 0
  for (const [key, count] of trackDay) {
    if (count > repeatMax) {
      repeatMax = count
      const [uri, date] = key.split('|')
      const t = tracks.get(uri)
      if (t) onRepeat = { track: t.name, artist: t.artist, date, plays: count }
    }
  }

  // Top artist per year
  const bestArtistByYear = new Map<number, ArtistYear>()
  for (const ay of artistYear.values()) {
    const cur = bestArtistByYear.get(ay.year)
    if (!cur || ay.minutes > cur.minutes) bestArtistByYear.set(ay.year, ay)
  }
  const topArtistPerYear = [...bestArtistByYear.values()]
    .sort((a, b) => a.year - b.year)
    .map((a) => ({ ...a, minutes: Math.round(a.minutes) }))

  // Yearly artist charts: who stayed near the top, and who owns "now"
  const byYearArtists = new Map<number, ArtistYear[]>()
  for (const ay of artistYear.values()) {
    const list = byYearArtists.get(ay.year)
    if (list) list.push(ay)
    else byYearArtists.set(ay.year, [ay])
  }
  const chartYears = [...byYearArtists.keys()].sort((a, b) => a - b)
  const topTwentyCounts = new Map<string, number>()
  for (const year of chartYears) {
    const chart = byYearArtists
      .get(year)!
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, LOYALTY_DEPTH)
    for (const entry of chart) {
      topTwentyCounts.set(entry.artist, (topTwentyCounts.get(entry.artist) ?? 0) + 1)
    }
  }
  const rideOrDie: RideOrDie[] = [...topTwentyCounts.entries()]
    .filter(([, years]) => chartYears.length > 1 && years >= Math.ceil(chartYears.length * 0.6))
    .map(([name, years]) => ({ name, years }))
    .sort((a, b) => b.years - a.years)
    .slice(0, 12)

  const recentYear = chartYears.length ? chartYears[chartYears.length - 1] : null
  const topArtistsRecent =
    recentYear === null
      ? []
      : byYearArtists
          .get(recentYear)!
          .slice()
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 20)
          .map((a) => ({ ...a, minutes: Math.round(a.minutes) }))

  // Discovery: new artists first heard each year
  const discoveryMap = new Map<number, number>()
  for (const artist of artists.values()) {
    discoveryMap.set(artist.firstYear, (discoveryMap.get(artist.firstYear) ?? 0) + 1)
  }
  const discovery = [...discoveryMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, newArtists]) => ({ year, newArtists }))

  // Longest streak of consecutive listening days
  const sortedDays = [...days.keys()].sort()
  let streak: LocalStats['streak'] = null
  if (sortedDays.length) {
    let bestLen = 1
    let bestStart = sortedDays[0]
    let bestEnd = sortedDays[0]
    let curLen = 1
    let curStart = sortedDays[0]
    const dayMs = (s: string) => new Date(`${s}T00:00:00`).getTime()
    for (let i = 1; i < sortedDays.length; i++) {
      const gap = Math.round((dayMs(sortedDays[i]) - dayMs(sortedDays[i - 1])) / 86_400_000)
      if (gap === 1) {
        curLen++
      } else {
        curLen = 1
        curStart = sortedDays[i]
      }
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
        bestEnd = sortedDays[i]
      }
    }
    streak = { days: bestLen, start: bestStart, end: bestEnd }
  }

  const totalMinutes = durationKnown ? totalMs / 60_000 : totalPlays
  const daysListened = days.size

  return {
    generatedAt: new Date().toISOString(),
    totalPlays,
    totalMs: durationKnown ? totalMs : null,
    distinctTracks: tracks.size,
    distinctArtists: artists.size,
    firstPlay: Number.isFinite(firstTs) ? new Date(firstTs).toISOString() : null,
    lastPlay: Number.isFinite(lastTs) ? new Date(lastTs).toISOString() : null,
    spanDays:
      Number.isFinite(firstTs) && Number.isFinite(lastTs)
        ? Math.max(1, Math.round((lastTs - firstTs) / 86_400_000))
        : 0,
    daysListened,
    avgMinutesPerDay: daysListened ? Math.round(totalMinutes / daysListened) : 0,
    skipRate: totalPlays ? skips / totalPlays : 0,
    shuffleRate: totalPlays ? shuffled / totalPlays : 0,
    offlineRate: totalPlays ? offlinePlays / totalPlays : 0,
    peakHour,
    peakHourPersona: peakHourPersona(peakHour),
    topTracks: topByMeasure(tracks, 30, durationKnown),
    topArtists: topByMeasure(artists, 30, durationKnown).map((artist) => ({
      name: artist.name,
      ms: artist.ms,
      plays: artist.plays,
      distinctTracks: artist.distinctTracks,
      firstYear: artist.firstYear,
    })),
    topAlbums: topByMeasure(albums, 20, durationKnown),
    byYear: [...years.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, v]) => ({ year, minutes: Math.round(v.minutes), plays: v.plays })),
    byMonth: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, minutes]) => ({ month, minutes: Math.round(minutes) })),
    clock: clock.map((b) => ({ hour: b.hour, minutes: Math.round(b.minutes) })),
    weekday: weekday.map((b) => ({ day: b.day, minutes: Math.round(b.minutes) })),
    seasonal: seasonal.map((b) => ({ month: b.month, minutes: Math.round(b.minutes) })),
    weekendMinutes: Math.round(weekendMinutes),
    weekdayMinutes: Math.round(weekdayMinutes),
    platforms: topBy(
      new Map([...platforms].map(([k, v]) => [k, { ...v, ms: v.minutes }])),
      6,
    ).map((row) => ({ label: row.label, minutes: Math.round(row.minutes), plays: row.plays })),
    countries: topBy(
      new Map([...countries].map(([k, v]) => [k, { ...v, ms: v.minutes }])),
      8,
    ).map((row) => ({ label: row.label, minutes: Math.round(row.minutes), plays: row.plays })),
    reasonEnd: [],
    recordDay: recordDay ? { ...recordDay, minutes: Math.round(recordDay.minutes) } : null,
    topArtistPerYear,
    discovery,
    streak,
    onRepeat,
    firstEver,
    sessions: sessionCount
      ? {
          count: sessionCount,
          avgMinutes: Math.round(totalMinutes / sessionCount),
          avgTracks: Math.max(1, Math.round(totalPlays / sessionCount)),
          longestTracks,
          longestMinutes: Math.round(longestMs / 60_000),
        }
      : null,
    recentYear,
    topArtistsRecent,
    rideOrDie,
    loyaltyScore: chartYears.length
      ? Math.round(
          (rideOrDie.reduce((sum, r) => sum + r.years, 0) /
            Math.max(1, rideOrDie.length * chartYears.length)) *
            100,
        )
      : 0,
    artistDiversity,
    activeYears: chartYears.length,
  }
}
