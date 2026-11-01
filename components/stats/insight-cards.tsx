'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { chart, tooltipStyle } from '@/components/charts/chart-theme'
import { BarRows, RankedList, SectionCard } from '@/components/stats/primitives'
import { rankedSpec, valueSpec } from '@/components/stats/share-specs'
import { formatMinutes, formatNumber, hourLabel, plural } from '@/lib/format'
import type {
  ClockData,
  DnaData,
  EraData,
  EvolutionData,
  LoyaltyData,
  MeterData,
  SessionData,
  SpotlightData,
} from '@/lib/unified/types'
import {
  Clock3,
  Gem,
  Headphones,
  HeartHandshake,
  Hourglass,
  Layers,
  Radar,
  Sprout,
} from 'lucide-react'

const SIZE = 252
const CENTER = SIZE / 2
const INNER = 36
const OUTER = 96

function wedgePath(hour: number, value: number, max: number) {
  const startAngle = (hour / 24) * Math.PI * 2 - Math.PI / 2
  const endAngle = ((hour + 0.82) / 24) * Math.PI * 2 - Math.PI / 2
  const r = INNER + (max > 0 ? (value / max) * (OUTER - INNER) : 0)
  // Fixed precision keeps the server and client paths byte-identical — float
  // noise in the last digit is enough to trip a hydration mismatch.
  const point = (angle: number, radius: number) =>
    `${(CENTER + Math.cos(angle) * radius).toFixed(3)},${(
      CENTER +
      Math.sin(angle) * radius
    ).toFixed(3)}`
  return [
    `M ${point(startAngle, INNER)}`,
    `L ${point(startAngle, r)}`,
    `A ${r} ${r} 0 0 1 ${point(endAngle, r)}`,
    `L ${point(endAngle, INNER)}`,
    `A ${INNER} ${INNER} 0 0 0 ${point(startAngle, INNER)}`,
    'Z',
  ].join(' ')
}

export function ListeningClockCard({ clock, scopeLabel }: { clock: ClockData; scopeLabel: string }) {
  const max = Math.max(...clock.bins.map((b) => b.value), 1)
  const readout = (value: number) =>
    clock.unit === 'minutes' ? formatMinutes(value) : `${value} play${value === 1 ? '' : 's'}`

  return (
    <SectionCard
      title="Listening Clock"
      icon={Clock3}
      subtitle={clock.caption}
      className="h-full"
      share={() =>
        valueSpec(
          `Body clock · ${scopeLabel}`,
          'When I press play',
          hourLabel(clock.peakHour),
          `is my peak · ${clock.persona}`,
        )
      }
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-52 w-52 shrink-0"
          role="img"
          aria-label={`Listening per hour; peak at ${hourLabel(clock.peakHour)}`}
        >
          <circle cx={CENTER} cy={CENTER} r={INNER - 4} fill="none" stroke="var(--color-border)" />
          {clock.bins.map(({ hour, value }) => (
            <path
              key={hour}
              d={wedgePath(hour, value, max)}
              fill="var(--color-primary)"
              opacity={
                hour === clock.peakHour ? 1 : value > 0 ? 0.25 + (value / max) * 0.45 : 0.08
              }
            >
              <title>{`${hourLabel(hour)} — ${readout(value)}`}</title>
            </path>
          ))}
          {[0, 6, 12, 18].map((h) => {
            const angle = (h / 24) * Math.PI * 2 - Math.PI / 2
            return (
              <text
                key={h}
                x={CENTER + Math.cos(angle) * (OUTER + 12)}
                y={CENTER + Math.sin(angle) * (OUTER + 12)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--color-muted-foreground)"
              >
                {h === 0 ? '12AM' : h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`}
              </text>
            )
          })}
        </svg>

        <div className="space-y-2 text-center sm:text-left">
          <p className="text-3xl font-semibold">{hourLabel(clock.peakHour)}</p>
          <p className="text-sm text-muted-foreground">is when your music peaks</p>
          <p className="text-sm">
            Verdict: <span className="font-medium text-primary">{clock.persona}</span>
          </p>
        </div>
      </div>
    </SectionCard>
  )
}

export function EraCard({ era, scopeLabel }: { era: EraData; scopeLabel: string }) {
  return (
    <SectionCard
      title="Era Explorer"
      icon={Hourglass}
      subtitle={era.caption}
      className="h-full"
      share={() =>
        rankedSpec(
          `Eras · ${scopeLabel}`,
          'When my music was made',
          era.decades.map((d) => ({ primary: d.decade, value: `${d.count}` })),
        )
      }
    >
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={era.decades} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chart.grid} strokeWidth={1} />
            <XAxis
              dataKey="decade"
              tickLine={false}
              axisLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: chart.accentDim }}
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value} tracks`, undefined]}
            />
            <Bar dataKey="count" name="Tracks" fill={chart.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {era.centerYear && (
        <p className="text-sm text-muted-foreground">
          Your musical center of gravity:{' '}
          <span className="font-semibold text-primary">{era.centerYear}</span>
          {era.oldest && (
            <>
              {' '}
              · oldest favorite:{' '}
              <span className="font-medium text-foreground">
                {era.oldest.name} ({era.oldest.year})
              </span>
            </>
          )}
        </p>
      )}
    </SectionCard>
  )
}

export function DnaCard({ dna, scopeLabel }: { dna: DnaData; scopeLabel: string }) {
  const max = dna.items[0]?.share ?? 1

  return (
    <SectionCard
      title={dna.title}
      icon={Layers}
      subtitle={dna.caption}
      className="h-full"
      share={() =>
        rankedSpec(
          `${dna.title} · ${scopeLabel}`,
          'What I actually listen to',
          dna.items.map((item, i) => ({
            rank: i + 1,
            primary: item.name,
            value: `${Math.round(item.share * 100)}%`,
          })),
        )
      }
    >
      <BarRows
        rows={dna.items.map((item) => ({
          key: item.name,
          label: item.name,
          value: `${Math.round(item.share * 100)}%`,
          fraction: max ? item.share / max : 0,
        }))}
      />

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">{dna.diversityLabel}</p>
        <p className="text-sm">
          <span className="font-semibold">{dna.diversity}/100</span>{' '}
          <span className="font-medium text-primary">· {dna.persona}</span>
        </p>
      </div>
    </SectionCard>
  )
}

export function MeterCard({ meter, scopeLabel }: { meter: MeterData; scopeLabel: string }) {
  return (
    <SectionCard
      title={meter.title}
      icon={Radar}
      subtitle={meter.caption}
      share={() =>
        valueSpec(
          `${meter.title} · ${scopeLabel}`,
          meter.activeBand,
          `${meter.value}`,
          meter.valueLabel.replace('/ 100', 'out of 100'),
        )
      }
    >
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-semibold tabular-nums">{meter.value}</span>
          <span className="text-sm text-muted-foreground">{meter.valueLabel}</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${meter.value}%` }}
          />
        </div>

        <div className="flex justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {meter.bands.map((band) => (
            <span
              key={band}
              className={meter.activeBand.startsWith(band) ? 'font-semibold text-primary' : ''}
            >
              {band}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{meter.description}</p>
      </div>
    </SectionCard>
  )
}

export function SessionsCard({
  sessions,
  scopeLabel,
}: {
  sessions: SessionData
  scopeLabel: string
}) {
  const stats = [
    { label: 'listening sessions', value: formatNumber(sessions.count) },
    ...(sessions.avgMinutes === null
      ? []
      : [{ label: 'average session', value: `${sessions.avgMinutes} min` }]),
    { label: 'tracks per session', value: `${sessions.avgTracks}` },
    {
      label:
        sessions.longestMinutes === null
          ? 'longest session'
          : `longest binge — ${sessions.longestMinutes} min straight`,
      value: plural(sessions.longestTracks, 'track'),
    },
  ]

  return (
    <SectionCard
      title="Session Patterns"
      icon={Headphones}
      subtitle={sessions.caption}
      share={() => ({
        variant: 'tile',
        eyebrow: `Sessions · ${scopeLabel}`,
        title: 'How I actually listen',
        stats: stats.map((s) => ({ label: s.label, value: s.value })),
      })}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function EvolutionCard({
  evolution,
  scopeLabel,
}: {
  evolution: EvolutionData
  scopeLabel: string
}) {
  return (
    <SectionCard
      title="Taste Evolution"
      icon={Sprout}
      subtitle={evolution.caption}
      share={() =>
        rankedSpec(
          `Taste shift · ${scopeLabel}`,
          'What changed lately',
          evolution.columns
            .flatMap((column) =>
              column.items.slice(0, 2).map((item) => ({
                primary: item.name,
                secondary: item.detail,
                value: column.title,
              })),
            )
            .slice(0, 5),
        )
      }
    >
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {evolution.columns.map((column) => (
          <div key={column.key} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <p className="text-[11px] text-muted-foreground">{column.subtitle}</p>
            </div>
            {column.items.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Nothing here — yet</p>
            ) : (
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item.key} className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={item.imageUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">{item.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function LoyaltyCard({ loyalty, scopeLabel }: { loyalty: LoyaltyData; scopeLabel: string }) {
  return (
    <SectionCard
      title="Ride or Die"
      icon={HeartHandshake}
      subtitle="The artists that never drop out of your rotation"
      className="h-full"
      share={() =>
        rankedSpec(
          `Ride or die · ${scopeLabel}`,
          'Never leaving my rotation',
          loyalty.artists.map((a, i) => ({ rank: i + 1, primary: a.name, value: '★' })),
        )
      }
    >
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-semibold tabular-nums">{loyalty.headline}</span>
        <span className="text-sm text-muted-foreground">{loyalty.caption}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {loyalty.artists.map((artist) => {
          const chip = (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={artist.imageUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[9px]">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{artist.name}</span>
            </>
          )
          const className =
            'flex items-center gap-2 rounded-full border border-border bg-muted/30 py-1 pl-1 pr-3 transition-colors hover:border-primary/50'
          return artist.url ? (
            <a key={artist.key} href={artist.url} target="_blank" rel="noreferrer" className={className}>
              {chip}
            </a>
          ) : (
            <span key={artist.key} className={className}>
              {chip}
            </span>
          )
        })}
      </div>
    </SectionCard>
  )
}

export function SpotlightCard({
  spotlight,
  scopeLabel,
}: {
  spotlight: SpotlightData
  scopeLabel: string
}) {
  return (
    <SectionCard
      title={spotlight.title}
      icon={Gem}
      subtitle={spotlight.caption}
      className="h-full"
      share={() =>
        rankedSpec(
          `${spotlight.title} · ${scopeLabel}`,
          spotlight.caption,
          spotlight.items.map((item) => ({
            rank: item.rank,
            primary: item.name,
            secondary: item.detail,
            value: item.value,
          })),
        )
      }
    >
      <RankedList
        rounded
        items={spotlight.items.map((item) => ({
          key: item.key,
          rank: item.rank,
          primary: item.name,
          secondary: item.detail,
          value: item.value,
          imageUrl: item.imageUrl,
          url: item.url,
        }))}
      />
    </SectionCard>
  )
}
