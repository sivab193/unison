'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarDays, Globe2, Headphones, Music2, Sparkles, TrendingUp } from 'lucide-react'
import { chart, tooltipStyle } from '@/components/charts/chart-theme'
import { BarRows, SectionCard } from '@/components/stats/primitives'
import { rankedSpec } from '@/components/stats/share-specs'
import { formatMinutes, formatNumber } from '@/lib/format'
import type { ContextRow, SeriesPoint, TimelineData } from '@/lib/unified/types'

/** Charts share one readout so minutes and play counts never render the same way. */
function readout(unit: TimelineData['unit']) {
  return (value: number) => (unit === 'minutes' ? formatMinutes(value) : formatNumber(value))
}

function axisTick(unit: TimelineData['unit']) {
  return (value: number) => (unit === 'minutes' ? `${Math.round(value / 60)}h` : `${value}`)
}

export function YearlyCard({
  data,
  unit,
  scopeLabel,
}: {
  data: SeriesPoint[]
  unit: TimelineData['unit']
  scopeLabel: string
}) {
  const format = readout(unit)
  return (
    <SectionCard
      title={unit === 'minutes' ? 'Minutes by year' : 'Plays by year'}
      icon={CalendarDays}
      subtitle="Your all-time trend"
      className="h-full"
      share={() =>
        rankedSpec(
          `By year · ${scopeLabel}`,
          'Year on year',
          data.map((d) => ({ primary: d.label, value: format(d.value) })),
        )
      }
    >
      <ResponsiveContainer width="100%" height={252}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" stroke={chart.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            stroke={chart.axis}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={axisTick(unit)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: chart.accentDim }}
            formatter={(value: number) => [format(value), 'Listened']}
          />
          <Bar dataKey="value" fill={chart.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

export function MonthlyCard({ data, unit }: { data: SeriesPoint[]; unit: TimelineData['unit'] }) {
  const format = readout(unit)
  return (
    <SectionCard
      title="Monthly rhythm"
      icon={Music2}
      subtitle={
        unit === 'minutes'
          ? 'Minutes each month across your history'
          : 'Music plays each month across your history'
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.accent} stopOpacity={0.5} />
              <stop offset="100%" stopColor={chart.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            stroke={chart.axis}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
            tickFormatter={(value: string) => value.slice(0, 4)}
          />
          <YAxis
            stroke={chart.axis}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={axisTick(unit)}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [format(value), 'Listened']} />
          <Area type="monotone" dataKey="value" stroke={chart.accent} strokeWidth={2} fill="url(#monthFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

/** Weekday / seasonal share one shape: a labelled bar row with opacity ramp. */
export function DistributionCard({
  title,
  subtitle,
  data,
  unit,
  scopeLabel,
  icon = CalendarDays,
}: {
  title: string
  subtitle: string
  data: SeriesPoint[]
  unit: TimelineData['unit']
  scopeLabel: string
  icon?: typeof CalendarDays
}) {
  const format = readout(unit)
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <SectionCard
      title={title}
      icon={icon}
      subtitle={subtitle}
      className="h-full"
      share={() =>
        rankedSpec(
          `${title} · ${scopeLabel}`,
          subtitle,
          [...data]
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((d, i) => ({ rank: i + 1, primary: d.label, value: format(d.value) })),
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            stroke={chart.axis}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: chart.accentDim }}
            formatter={(value: number) => [format(value), 'Listened']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.label} fill={chart.accent} fillOpacity={0.35 + (d.value / max) * 0.65} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

export function DiscoveryCard({ data, scopeLabel }: { data: SeriesPoint[]; scopeLabel: string }) {
  return (
    <SectionCard
      title="New artists discovered"
      icon={Sparkles}
      subtitle="First time you heard each artist, by year"
      share={() =>
        rankedSpec(
          `Discovery · ${scopeLabel}`,
          'New artists per year',
          data.map((d) => ({ primary: d.label, value: `${d.value}` })),
        )
      }
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" stroke={chart.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke={chart.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: chart.accentDim }}
            formatter={(value: number) => [value, 'New artists']}
          />
          <Bar dataKey="value" fill={chart.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

export function TopArtistPerYearCard({
  entries,
  scopeLabel,
}: {
  entries: TimelineData['topArtistPerYear']
  scopeLabel: string
}) {
  return (
    <SectionCard
      title="Your #1 each year"
      icon={TrendingUp}
      subtitle="The artist that owned every year"
      share={() =>
        rankedSpec(
          `Year by year · ${scopeLabel}`,
          'My #1 artist each year',
          entries.map((e) => ({ primary: e.artist, secondary: `${e.year}`, value: e.detail })),
        )
      }
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {entries.map((entry) => (
          <div
            key={entry.year}
            className="flex min-w-[140px] flex-col gap-1 rounded-xl border border-border bg-gradient-to-b from-primary/5 to-card p-4"
          >
            <span className="text-xs font-semibold text-primary">{entry.year}</span>
            <span className="truncate text-sm font-semibold" title={entry.artist}>
              {entry.artist}
            </span>
            <span className="text-xs text-muted-foreground">{entry.detail}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function ContextCard({
  title,
  subtitle,
  rows,
  scopeLabel,
  icon,
}: {
  title: string
  subtitle: string
  rows: ContextRow[]
  scopeLabel: string
  icon: typeof Headphones
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <SectionCard
      title={title}
      icon={icon}
      subtitle={subtitle}
      className="h-full"
      share={() =>
        rankedSpec(
          `${title} · ${scopeLabel}`,
          subtitle,
          rows.map((row, i) => ({ rank: i + 1, primary: row.label, value: row.display })),
        )
      }
    >
      <BarRows
        rows={rows.map((row) => ({
          key: row.label,
          label: row.label,
          value: row.display,
          fraction: row.value / max,
        }))}
      />
    </SectionCard>
  )
}

export const CONTEXT_ICONS = { platforms: Headphones, countries: Globe2 }
