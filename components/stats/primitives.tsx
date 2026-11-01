'use client'

import { Card } from '@/components/ui/card'
import { ShareButton } from '@/components/stats/share-button'
import { SHARE_TEXT } from '@/components/stats/share-specs'
import { useCountUp } from '@/lib/use-count-up'
import type { ShareSpec } from '@/lib/share-card'
import type { HighlightData, HighlightIcon, TileData, TileIcon } from '@/lib/unified/types'
import {
  CalendarDays,
  Clock3,
  Disc3,
  Flame,
  Headphones,
  HeartHandshake,
  Layers,
  Mic2,
  Music2,
  Radar,
  Repeat,
  Shuffle,
  SkipForward,
  Sparkles,
  Sunrise,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export const TILE_ICONS: Record<TileIcon, LucideIcon> = {
  hours: Headphones,
  artists: Mic2,
  tracks: Music2,
  albums: Disc3,
  calendar: CalendarDays,
  genre: Layers,
  radar: Radar,
  clock: Clock3,
  loyalty: HeartHandshake,
  skip: SkipForward,
  shuffle: Shuffle,
  weekend: Sunrise,
}

const HIGHLIGHT_ICONS: Record<HighlightIcon, LucideIcon> = {
  repeat: Repeat,
  flame: Flame,
  trophy: Trophy,
  sparkles: Sparkles,
  headphones: Headphones,
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div
      className={`min-w-0 animate-fade-slide-up opacity-0 ${className ?? ''}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}

/** Card header + optional share button, used by every insight section. */
export function SectionCard({
  title,
  icon: Icon,
  subtitle,
  children,
  share,
  className,
}: {
  title: string
  icon: LucideIcon
  subtitle?: string
  children: React.ReactNode
  share?: () => ShareSpec
  className?: string
}) {
  return (
    <Card className={`group/card gap-4 p-6 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon className="h-4 w-4 shrink-0 text-primary" /> {title}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {share && (
          <ShareButton
            spec={share}
            text={SHARE_TEXT}
            filename={`unison-${title.toLowerCase().replace(/\s+/g, '-')}.png`}
          />
        )}
      </div>
      {children}
    </Card>
  )
}

export function Tile({ tile, share }: { tile: TileData; share: () => ShareSpec }) {
  const Icon = TILE_ICONS[tile.icon]
  const animated = useCountUp(tile.countTo ?? 0)

  return (
    <Card className="group/card relative h-full gap-2 overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide">{tile.label}</span>
        </div>
        <ShareButton spec={share} text={SHARE_TEXT} filename={`unison-${tile.key}.png`} />
      </div>
      {tile.countTo === null ? (
        <p className="text-2xl font-semibold capitalize leading-tight">{tile.value}</p>
      ) : (
        <p className="text-3xl font-semibold leading-tight tabular-nums">
          {animated.toLocaleString(undefined, {
            minimumFractionDigits: tile.decimals,
            maximumFractionDigits: tile.decimals,
          })}
          <span className="text-xl text-muted-foreground">{tile.suffix}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">{tile.hint}</p>
    </Card>
  )
}

export function Highlight({
  highlight,
  share,
}: {
  highlight: HighlightData
  share: () => ShareSpec
}) {
  const Icon = HIGHLIGHT_ICONS[highlight.icon]
  return (
    <Card className="group/card relative h-full gap-3 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <ShareButton spec={share} text={SHARE_TEXT} filename={`unison-${highlight.key}.png`} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {highlight.eyebrow}
      </p>
      <p className="text-balance text-2xl font-bold leading-tight">{highlight.title}</p>
      <p className="text-sm text-muted-foreground">{highlight.subtitle}</p>
    </Card>
  )
}

export interface RankedItem {
  key: string
  rank: number
  primary: string
  secondary?: string
  value: string
  imageUrl?: string | null
  url?: string | null
  share?: () => ShareSpec
}

/** The one ranked-list look, used for artists, tracks, albums and spotlights. */
export function RankedList({ items, rounded }: { items: RankedItem[]; rounded?: boolean }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this scope</p>
  }

  return (
    <ol className="space-y-1">
      {items.map((item) => {
        const label = (
          <>
            <p className="truncate text-sm font-medium">{item.primary}</p>
            {item.secondary && (
              <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
            )}
          </>
        )

        return (
          <li
            key={item.key}
            className="group/card flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
          >
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">
              {item.rank}
            </span>
            {item.imageUrl !== undefined && (
              <Cover url={item.imageUrl} label={item.primary} rounded={rounded} />
            )}
            {/* Only the label links out, so the share button stays its own control */}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 hover:text-primary"
              >
                {label}
              </a>
            ) : (
              <div className="min-w-0 flex-1">{label}</div>
            )}
            {item.share && (
              <ShareButton spec={item.share} text={SHARE_TEXT} filename="unison-pick.png" />
            )}
            <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
              {item.value}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Artwork when the source has it, a stable initial-tile when it doesn't. */
function Cover({
  url,
  label,
  rounded,
}: {
  url: string | null
  label: string
  rounded?: boolean
}) {
  const shape = rounded ? 'rounded-full' : 'rounded-md'
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`h-10 w-10 shrink-0 object-cover ${shape}`} />
  }
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-sm font-semibold text-primary ${shape}`}
      aria-hidden
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** Horizontal bar rows — genre/artist shares, devices, countries. */
export function BarRows({
  rows,
}: {
  rows: { key: string; label: string; value: string; fraction: number }[]
}) {
  return (
    <div className="space-y-3 pt-1">
      {rows.map((row) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium capitalize" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 text-muted-foreground">{row.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(row.fraction * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
