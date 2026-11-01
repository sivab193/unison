'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { aggregate } from '@/lib/streaming-history/aggregate'
import { ALL_FILTERS, type ParseMeta, type Play, type PlayFilters } from '@/lib/streaming-history/types'
import { fromLocalStats } from '@/lib/unified/from-local'
import type { StatsSource, UnifiedStats } from '@/lib/unified/types'

interface StatsContextValue {
  stats: UnifiedStats | null
  status: 'loading' | 'ready' | 'error'
  source: StatsSource
  retry: () => void
  meta: ParseMeta | null
  filters: PlayFilters | null
  setFilters: (filters: PlayFilters) => void
  /** True while a filter change is re-aggregating */
  recomputing: boolean
  onReset: (() => void) | null
}

const StatsContext = createContext<StatsContextValue | null>(null)

const BASE: Pick<
  StatsContextValue,
  'meta' | 'filters' | 'setFilters' | 'recomputing' | 'onReset'
> = {
  meta: null,
  filters: null,
  setFilters: () => {},
  recomputing: false,
  onReset: null,
}

function scopeLabelFor(filters: PlayFilters): string {
  if (filters.years?.length) {
    const sorted = [...filters.years].sort((a, b) => a - b)
    return sorted.length === 1 ? `${sorted[0]}` : `${sorted[0]}–${sorted[sorted.length - 1]}`
  }
  return 'All time'
}

/** Plays parsed from a music-service ZIP export — everything stays in the browser. */
export function LocalStatsProvider({
  children,
  plays,
  meta,
  onReset,
}: {
  children: ReactNode
  plays: Play[]
  meta: ParseMeta
  onReset: () => void
}) {
  const [filters, setFiltersState] = useState<PlayFilters>(ALL_FILTERS)
  const [recomputing, startTransition] = useTransition()

  const setFilters = useCallback((next: PlayFilters) => {
    startTransition(() => setFiltersState(next))
  }, [])

  const stats = useMemo(
    () => fromLocalStats(aggregate(plays, filters), scopeLabelFor(filters), meta),
    [plays, filters, meta],
  )

  const value = useMemo<StatsContextValue>(
    () => ({
      ...BASE,
      stats,
      status: 'ready',
      source: 'upload',
      retry: onReset,
      meta,
      filters,
      setFilters,
      recomputing,
      onReset,
    }),
    [stats, meta, filters, setFilters, recomputing, onReset],
  )

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
}

export function useStats() {
  const context = useContext(StatsContext)
  if (!context) throw new Error('useStats must be used inside a stats provider')
  return context
}
