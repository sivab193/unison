'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, FileArchive, RotateCcw, Upload } from 'lucide-react'
import { useStats } from '@/components/providers/stats-provider'
import { useCan3D } from '@/lib/use-preferences'
import { DashboardSkeleton } from '@/components/stats/card-skeleton'
import { ErrorState } from '@/components/stats/error-state'
import { LazyAlbumWall, LazyArtistGalaxy, LazyHeroScene } from '@/components/three/lazy'
import { ShareButton } from '@/components/stats/share-button'
import { Highlight, Reveal, Tile } from '@/components/stats/primitives'
import { TopAlbumsCard, TopArtistsCard, TopTracksCard } from '@/components/stats/top-lists'
import {
  DnaCard,
  EvolutionCard,
  EraCard,
  ListeningClockCard,
  LoyaltyCard,
  MeterCard,
  SessionsCard,
  SpotlightCard,
} from '@/components/stats/insight-cards'
import {
  CONTEXT_ICONS,
  ContextCard,
  DiscoveryCard,
  DistributionCard,
  MonthlyCard,
  TopArtistPerYearCard,
  YearlyCard,
} from '@/components/stats/timeline-cards'
import { highlightSpec, recapSpec, SHARE_TEXT, tileSpec } from '@/components/stats/share-specs'
import { useCountUp } from '@/lib/use-count-up'
import { CalendarDays, Sparkles } from 'lucide-react'
import type { UnifiedStats } from '@/lib/unified/types'

function Hero({ stats, onReset }: { stats: UnifiedStats; onReset: (() => void) | null }) {
  const counted = useCountUp(stats.hero.countTo ?? 0)
  const isNumber = stats.hero.countTo !== null

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-70">
        <LazyHeroScene className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pb-10 pt-14 text-center">
        <Reveal>
          {isNumber ? (
            <h1 className="text-6xl font-black tracking-tight tabular-nums sm:text-8xl">
              {counted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-primary">{stats.hero.suffix}</span>
            </h1>
          ) : (
            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-6xl">
              {stats.hero.value}
            </h1>
          )}
        </Reveal>
        <Reveal delay={0.05}>
          <p className="max-w-md text-pretty text-muted-foreground">{stats.hero.caption}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <ShareButton
              spec={() => recapSpec(stats)}
              variant="full"
              label="Share my recap"
              filename="unison-recap.png"
              text={SHARE_TEXT}
            />
            {onReset && (
              <Button variant="outline" size="lg" className="rounded-full" onClick={onReset}>
                <RotateCcw className="h-4 w-4" /> Upload another
              </Button>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  )
}

/**
 * The basic Spotify account-data export lacks album/device/shuffle fields.
 * Explain that limitation instead of letting those sections vanish silently.
 */
function ExportUpsell({ intro, missing }: { intro: string; missing: string[] }) {
  return (
    <Card className="gap-4 border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FileArchive className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Want the full picture?</h2>
          <p className="text-sm text-muted-foreground">{intro}</p>
        </div>
      </div>

      <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {missing.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button asChild className="rounded-full">
          <Link href="/upload">
            <Upload className="h-4 w-4" /> How to get it
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Read in your browser · nothing is uploaded anywhere
        </p>
      </div>
    </Card>
  )
}

const BASIC_INTRO =
  'This is the basic “Account data” export — it covers roughly the past year and records only the time, artist and track of each play. The “Extended streaming history” export goes back to your very first play and adds:'

const BASIC_MISSING = [
  'Your full history, not just the last ~12 months',
  'Top albums, and the album behind every track',
  'Which devices and countries you listened from',
  'Real shuffle and skip flags, not just short plays',
  'Links straight through to each track on Spotify',
  'Year-by-year taste evolution and loyalty',
]

export function StatsDashboard() {
  const { stats, status, retry, onReset, recomputing } = useStats()
  const can3D = useCan3D()

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <DashboardSkeleton />
      </div>
    )
  }
  if (status === 'error' || !stats) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState onRetry={retry} />
      </div>
    )
  }

  const { timeline, contexts, scopeLabel } = stats
  const hasSeasonal = timeline.seasonal.length > 0
  const hasWeekday = timeline.weekday.some((d) => d.value > 0)

  return (
    <div className={recomputing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <Hero stats={stats} onReset={onReset} />

      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16">
        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.tiles.map((tile, i) => (
            <Reveal key={tile.key} delay={0.05 * (i % 4)} className="h-full">
              <Tile tile={tile} share={() => tileSpec(tile, scopeLabel)} />
            </Reveal>
          ))}
        </div>

        {/* Standout moments */}
        {stats.highlights.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.highlights.map((highlight, i) => (
              <Reveal key={highlight.key} delay={0.05 * i} className="h-full">
                <Highlight highlight={highlight} share={() => highlightSpec(highlight)} />
              </Reveal>
            ))}
          </div>
        )}

        {/* 3D */}
        {can3D && <LazyArtistGalaxy />}
        {can3D && <LazyAlbumWall />}

        {/* Charts */}
        {/* The basic export has no album field, so that column drops out */}
        <div className={`grid gap-6 ${stats.albums.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <Reveal className="h-full">
            <TopArtistsCard stats={stats} />
          </Reveal>
          <Reveal delay={0.05} className="h-full">
            <TopTracksCard stats={stats} />
          </Reveal>
          {stats.albums.length > 0 && (
            <Reveal delay={0.1} className="h-full">
              <TopAlbumsCard stats={stats} />
            </Reveal>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {stats.clock && (
            <Reveal className="h-full">
              <ListeningClockCard clock={stats.clock} scopeLabel={scopeLabel} />
            </Reveal>
          )}
          {stats.era ? (
            <Reveal delay={0.05} className="h-full">
              <EraCard era={stats.era} scopeLabel={scopeLabel} />
            </Reveal>
          ) : (
            timeline.byYear.length > 0 && (
              <Reveal delay={0.05} className="h-full">
                <YearlyCard data={timeline.byYear} unit={timeline.unit} scopeLabel={scopeLabel} />
              </Reveal>
            )
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {stats.dna && (
            <Reveal className="h-full">
              <DnaCard dna={stats.dna} scopeLabel={scopeLabel} />
            </Reveal>
          )}
          <div className="space-y-6">
            {stats.meter && (
              <Reveal delay={0.05}>
                <MeterCard meter={stats.meter} scopeLabel={scopeLabel} />
              </Reveal>
            )}
            {stats.sessions && (
              <Reveal delay={0.1}>
                <SessionsCard sessions={stats.sessions} scopeLabel={scopeLabel} />
              </Reveal>
            )}
          </div>
        </div>

        {stats.evolution && (
          <Reveal>
            <EvolutionCard evolution={stats.evolution} scopeLabel={scopeLabel} />
          </Reveal>
        )}

        {(stats.loyalty || stats.spotlight) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.loyalty && (
              <Reveal className="h-full">
                <LoyaltyCard loyalty={stats.loyalty} scopeLabel={scopeLabel} />
              </Reveal>
            )}
            {stats.spotlight && (
              <Reveal delay={0.05} className="h-full">
                <SpotlightCard spotlight={stats.spotlight} scopeLabel={scopeLabel} />
              </Reveal>
            )}
          </div>
        )}

        {timeline.topArtistPerYear.length > 1 && (
          <Reveal>
            <TopArtistPerYearCard entries={timeline.topArtistPerYear} scopeLabel={scopeLabel} />
          </Reveal>
        )}

        {timeline.byMonth.length > 1 && (
          <Reveal>
            <MonthlyCard data={timeline.byMonth} unit={timeline.unit} />
          </Reveal>
        )}

        {(hasSeasonal || hasWeekday) && (
          <div className={`grid gap-6 ${hasSeasonal && hasWeekday ? 'lg:grid-cols-2' : ''}`}>
            {hasSeasonal && (
              <Reveal className="h-full">
                <DistributionCard
                  title="Seasons of sound"
                  subtitle="Which months you play the most"
                  icon={Sparkles}
                  data={timeline.seasonal}
                  unit={timeline.unit}
                  scopeLabel={scopeLabel}
                />
              </Reveal>
            )}
            {hasWeekday && (
              <Reveal delay={0.05} className="h-full">
                <DistributionCard
                  title="Days of the week"
                  subtitle={timeline.weekdayCaption}
                  icon={CalendarDays}
                  data={timeline.weekday}
                  unit={timeline.unit}
                  scopeLabel={scopeLabel}
                />
              </Reveal>
            )}
          </div>
        )}

        {timeline.discovery.length > 1 && (
          <Reveal>
            <DiscoveryCard data={timeline.discovery} scopeLabel={scopeLabel} />
          </Reveal>
        )}

        {(contexts.platforms.length > 0 || contexts.countries.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {contexts.platforms.length > 0 && (
              <Reveal className="h-full">
                <ContextCard
                  title="Where you listen"
                  subtitle="By device / platform"
                  icon={CONTEXT_ICONS.platforms}
                  rows={contexts.platforms}
                  scopeLabel={scopeLabel}
                />
              </Reveal>
            )}
            {contexts.countries.length > 0 && (
              <Reveal delay={0.05} className="h-full">
                <ContextCard
                  title="Around the world"
                  subtitle="Where you were when you listened"
                  icon={CONTEXT_ICONS.countries}
                  rows={contexts.countries}
                  scopeLabel={scopeLabel}
                />
              </Reveal>
            )}
          </div>
        )}

        {stats.basicExport && (
          <Reveal>
            <ExportUpsell intro={BASIC_INTRO} missing={BASIC_MISSING} />
          </Reveal>
        )}

        <p className="pt-4 text-center text-xs text-muted-foreground">{stats.footnote}</p>
      </div>
    </div>
  )
}
