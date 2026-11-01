import Link from 'next/link'
import { ArrowRight, Clock3, Orbit, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/brand/logo'
import { LazyHeroScene } from '@/components/three/lazy'
import { Button } from '@/components/ui/button'
import { SiteFooter } from '@/components/site-footer'

const FEATURES = [
  {
    icon: Orbit,
    title: 'Explore the shape of your taste',
    body: 'Orbit through artist galaxies, browse your album wall, and watch years of listening turn into a world you can move through.',
  },
  {
    icon: Clock3,
    title: 'See the whole history',
    body: 'Find your peak hours, longest streak, repeat offenders, listening eras, and the artists that never left your rotation.',
  },
  {
    icon: ShieldCheck,
    title: 'Keep every play private',
    body: 'The ZIP is opened by your browser and never sent to Unison, a music service, or an analytics endpoint.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Unison home">
          <LogoMark className="h-10 w-10 rounded-[24%] shadow-sm shadow-primary/20" />
          <span className="text-lg font-bold tracking-tight">Unison</span>
        </Link>
        <Button asChild size="sm">
          <Link href="/upload">
            Open your export <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <main>
        <section className="relative flex min-h-[72vh] items-center px-5 pb-16 pt-8 sm:px-8 lg:min-h-[76vh]">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <LazyHeroScene className="h-full w-full" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/35 via-background/20 to-background" />

          <div className="relative z-10 mx-auto w-full max-w-6xl">
            <div className="max-w-3xl space-y-7">
              <h1 className="text-balance text-5xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Every play. One private music universe.
              </h1>
              <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Turn your Spotify, Apple Music, or YouTube Music export into an explorable lifetime
                recap. No account connection, no music API, and no file upload.
              </p>
              <div className="pointer-events-auto flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-13 px-7 text-base font-semibold">
                  <Link href="/upload">
                    Choose your music service <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> ZIP processing stays in this tab
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="grid gap-10 border-y border-border py-10 md:grid-cols-3 md:gap-0">
            {FEATURES.map(({ icon: Icon, title, body }, index) => (
              <article
                key={title}
                className={index === 0 ? 'md:pr-8' : 'md:border-l md:border-border md:px-8'}
              >
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
