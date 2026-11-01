// One view model for every browser-parsed music export. Each adapter fills
// what its file format knows and leaves unavailable sections null or empty.

export type StatsSource = 'upload'

export type TileIcon =
  | 'hours'
  | 'artists'
  | 'tracks'
  | 'albums'
  | 'calendar'
  | 'genre'
  | 'radar'
  | 'clock'
  | 'loyalty'
  | 'skip'
  | 'shuffle'
  | 'weekend'

export type HighlightIcon = 'repeat' | 'flame' | 'trophy' | 'sparkles' | 'headphones'

export interface UnifiedArtist {
  key: string
  name: string
  imageUrl: string | null
  url: string | null
  genres: string[]
  followers: number | null
  popularity: number | null
  minutes: number | null
  plays: number | null
  distinctTracks: number | null
  firstYear: number | null
  rank: number
  /** Legend/grouping label for the 3D galaxy — genre (API) or discovery era (export) */
  cluster: string
  /** Right-hand value in ranked lists and share cards */
  value: string
  /** Secondary line in ranked lists */
  detail: string
}

export interface UnifiedTrack {
  key: string
  name: string
  artist: string
  album: string
  imageUrl: string | null
  url: string | null
  releaseYear: number | null
  rank: number
  value: string
  detail: string
}

export interface UnifiedAlbum {
  key: string
  name: string
  artist: string
  imageUrl: string | null
  url: string | null
  rank: number
  value: string
  detail: string
}

export interface HeroData {
  eyebrow: string
  /** Set when the headline is a number the page should count up to */
  countTo: number | null
  value: string
  suffix: string
  caption: string
}

export interface TileData {
  key: string
  icon: TileIcon
  label: string
  value: string
  /** Set to animate from 0 — `value` is then only the SSR/fallback text */
  countTo: number | null
  decimals: number
  suffix: string
  hint: string
}

export interface HighlightData {
  key: string
  icon: HighlightIcon
  eyebrow: string
  title: string
  subtitle: string
  /** Big number on the shared image; falls back to the title */
  shareValue?: string
  /** Punchier eyebrow for the image — the card eyebrow reads better in-page */
  shareEyebrow?: string
  /** Caption under the big number; falls back to `subtitle` */
  shareCaption?: string
}

/**
 * The story-format recap image. It gets its own copy rather than reusing the
 * hero + first four tiles: the page can afford a long caption and eight tiles,
 * the card can't, so each source hand-picks what reads best at poster size.
 */
export interface RecapData {
  /** Short line under the big number — the hero caption is too long for the card */
  caption: string
  /** Exactly the four cells of the 2×2 grid at the bottom */
  stats: { label: string; value: string }[]
}

export interface ClockData {
  bins: { hour: number; value: number }[]
  unit: 'plays' | 'minutes'
  peakHour: number
  persona: string
  caption: string
}

export interface DnaData {
  title: string
  caption: string
  items: { name: string; share: number }[]
  diversity: number
  persona: string
  diversityLabel: string
}

export interface MeterData {
  title: string
  caption: string
  /** 0–100 */
  value: number
  valueLabel: string
  bands: string[]
  activeBand: string
  description: string
}

export interface EraData {
  decades: { decade: string; count: number }[]
  centerYear: number | null
  oldest: { name: string; year: number } | null
  caption: string
}

export interface EvolutionEntry {
  key: string
  name: string
  imageUrl: string | null
  detail: string
}

export interface EvolutionColumn {
  key: string
  title: string
  subtitle: string
  items: EvolutionEntry[]
}

export interface EvolutionData {
  caption: string
  columns: EvolutionColumn[]
}

export interface LoyaltyData {
  headline: string
  score: number
  caption: string
  artists: { key: string; name: string; imageUrl: string | null; url: string | null }[]
}

export interface SessionData {
  count: number
  avgMinutes: number | null
  avgTracks: number
  longestTracks: number
  longestMinutes: number | null
  caption: string
}

export interface SpotlightData {
  title: string
  caption: string
  items: UnifiedArtist[]
}

export interface SeriesPoint {
  label: string
  value: number
}

export interface TimelineData {
  /** Minutes (export) or plays (API) — drives axis + tooltip formatting */
  unit: 'plays' | 'minutes'
  byYear: SeriesPoint[]
  byMonth: SeriesPoint[]
  weekday: SeriesPoint[]
  seasonal: SeriesPoint[]
  discovery: SeriesPoint[]
  topArtistPerYear: { year: number; artist: string; detail: string }[]
  /** Sub-line for the weekday card — the two sources sample different windows */
  weekdayCaption: string
}

export interface ContextRow {
  label: string
  value: number
  display: string
}

export interface UnifiedStats {
  source: StatsSource
  /** "Last 6 Months", "All time", "2023–2025" … */
  scopeLabel: string
  /** Human-readable basis for ranked lists. */
  rankingLabel?: string
  hero: HeroData
  tiles: TileData[]
  /** Upload path only: the plays came from the basic export, not the extended one */
  basicExport?: boolean
  recap: RecapData
  highlights: HighlightData[]
  artists: UnifiedArtist[]
  tracks: UnifiedTrack[]
  albums: UnifiedAlbum[]
  /** What the galaxy clusters mean for this source */
  clusterLabel: string
  clock: ClockData | null
  era: EraData | null
  dna: DnaData | null
  meter: MeterData | null
  evolution: EvolutionData | null
  loyalty: LoyaltyData | null
  sessions: SessionData | null
  spotlight: SpotlightData | null
  timeline: TimelineData
  contexts: { platforms: ContextRow[]; countries: ContextRow[] }
  footnote: string
}
