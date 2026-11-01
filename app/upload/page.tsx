'use client'

import { useCallback, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { Apple, ArrowLeft, Clock, Headphones, ShieldCheck, Youtube } from 'lucide-react'
import { LogoMark } from '@/components/brand/logo'
import { LocalStatsProvider } from '@/components/providers/stats-provider'
import { StatsDashboard } from '@/components/stats/dashboard'
import { StatsShell } from '@/components/stats/shell'
import { Button } from '@/components/ui/button'
import { UploadDropzone } from '@/components/upload/upload-dropzone'
import { SiteFooter } from '@/components/site-footer'
import type { DataPlatform, ParseMeta, Play } from '@/lib/streaming-history/types'
import { cn } from '@/lib/utils'

interface SourceGuide {
  label: string
  icon: ComponentType<{ className?: string }>
  href: string
  linkLabel: string
  timing: string
  steps: string[]
}

const SOURCES: Record<DataPlatform, SourceGuide> = {
  spotify: {
    label: 'Spotify',
    icon: Headphones,
    href: 'https://www.spotify.com/account/privacy/',
    linkLabel: 'Spotify account privacy',
    timing: 'Spotify says an extended-history export can take up to 30 days.',
    steps: [
      'Open your account privacy page and find “Download your data.”',
      'Request Extended streaming history. The smaller Account data export also works, with fewer details.',
      'Download the ZIP from Spotify’s email and leave it zipped.',
    ],
  },
  apple: {
    label: 'Apple Music',
    icon: Apple,
    href: 'https://privacy.apple.com/',
    linkLabel: 'Apple Data & Privacy',
    timing: 'Apple says preparing a data copy can take up to seven days.',
    steps: [
      'Choose “Request a copy of your data” in Apple Data & Privacy.',
      'Select Apple Media Services information, then complete the request.',
      'Download the ZIP. Nested Apple Music archives are opened automatically in your browser.',
    ],
  },
  youtube: {
    label: 'YouTube Music',
    icon: Youtube,
    href: 'https://takeout.google.com/',
    linkLabel: 'Google Takeout',
    timing: 'Google usually prepares Takeout archives within hours, depending on archive size.',
    steps: [
      'In Google Takeout, deselect everything, then choose YouTube and YouTube Music.',
      'Keep History selected. HTML and JSON watch-history formats are both supported.',
      'Download the ZIP. Regular YouTube watches are ignored; only YouTube Music entries are counted.',
    ],
  },
}

export default function UploadPage() {
  const [source, setSource] = useState<DataPlatform>('spotify')
  const [data, setData] = useState<{ plays: Play[]; meta: ParseMeta } | null>(null)
  const reset = useCallback(() => setData(null), [])

  if (data) {
    return (
      <LocalStatsProvider plays={data.plays} meta={data.meta} onReset={reset}>
        <StatsShell>
          <StatsDashboard />
        </StatsShell>
      </LocalStatsProvider>
    )
  }

  const guide = SOURCES[source]

  return (
    <div className="min-h-screen bg-background">
      <main className="flex flex-col items-center px-4 py-14">
        <div className="w-full max-w-2xl space-y-9">
        <div className="space-y-4 text-center">
          <LogoMark className="mx-auto h-14 w-14 rounded-[26%] shadow-lg shadow-primary/25" />
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Your listening, <span className="text-primary">unpacked</span>
          </h1>
          <p className="mx-auto max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Choose your music service and drop its export ZIP. Every play is parsed, filtered, and
            visualized on this device—there is no login and no music API.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2" aria-label="Music service">
          {(Object.keys(SOURCES) as DataPlatform[]).map((key) => {
            const item = SOURCES[key]
            const Icon = item.icon
            const active = key === source
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setSource(key)}
                className={cn(
                  'flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </div>

        <UploadDropzone key={source} source={source} onReady={(plays, meta) => setData({ plays, meta })} />

        <section className="space-y-5 rounded-xl bg-card p-5 sm:p-6" aria-labelledby="export-guide">
          <div className="flex items-center justify-between gap-4">
            <h2 id="export-guide" className="text-lg font-semibold">
              Get your {guide.label} export
            </h2>
            <a
              href={guide.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {guide.linkLabel}
            </a>
          </div>
          <ol className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{guide.timing}</span>
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          The ZIP never leaves this browser tab. Closing the tab clears it.
        </p>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Button>
        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
