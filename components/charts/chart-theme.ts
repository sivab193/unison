// Shared chart tokens. Single-series charts use the Unison accent; the genre
// galaxy's cluster palette below is categorical and was validated with the
// dataviz six-checks (all-pairs CVD ΔE 25.5 on the dark card surface).
export const chart = {
  /** brand accent — the one hue for single-series marks */
  accent: 'var(--color-primary)',
  accentDim: 'color-mix(in oklch, var(--color-primary) 35%, transparent)',
  grid: 'var(--color-border)',
  axis: 'var(--color-muted-foreground)',
  deemphasis: 'oklch(0.35 0.02 275)',
}

/** Fixed genre→color order; assigned in sequence, never cycled. */
export const GENRE_COLORS = ['#8b8cf8', '#58b5d8', '#d4a64e', '#c66b96', '#d6725e']
export const GENRE_OTHER_COLOR = '#676879'

export const tooltipStyle = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  color: 'var(--color-popover-foreground)',
} as const

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
