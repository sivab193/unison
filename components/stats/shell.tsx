'use client'

import Link from 'next/link'
import { RotateCcw, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/upload/filter-bar'
import { useStats } from '@/components/providers/stats-provider'
import { SiteFooter } from '@/components/site-footer'
import type { ReactNode } from 'react'

/**
 * One header for every source. The scope control swaps — a range select for
 * the API paths, the year/device filters for an export — but everything else
 * (brand, identity line, actions) stays put.
 */
export function StatsShell({ children }: { children: ReactNode }) {
  const { meta, filters, setFilters, recomputing, onReset } = useStats()
  const sourceLabel =
    meta?.source === 'youtube'
      ? 'YouTube Music'
      : meta?.source === 'apple'
        ? 'Apple Music'
        : 'Spotify'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-10 rounded-[24%] shadow-sm shadow-primary/20" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Unison</h1>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" /> {sourceLabel} export · local only
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="gap-2"
                aria-label="New upload"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">New upload</span>
              </Button>
            )}
          </div>
        </div>

        {meta && filters && (
          <FilterBar meta={meta} filters={filters} onChange={setFilters} pending={recomputing} />
        )}
      </header>

      <main>{children}</main>

      <SiteFooter />
    </div>
  )
}
