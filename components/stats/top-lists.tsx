'use client'

import { Disc3, Mic2, Music2 } from 'lucide-react'
import { RankedList, SectionCard } from '@/components/stats/primitives'
import { rankedSpec, valueSpec } from '@/components/stats/share-specs'
import type { UnifiedStats } from '@/lib/unified/types'

const LIMIT = 10

export function TopArtistsCard({ stats }: { stats: UnifiedStats }) {
  const items = stats.artists.slice(0, LIMIT)

  return (
    <SectionCard
      title="Top artists"
      icon={Mic2}
      subtitle={stats.rankingLabel ?? 'Ranked by listening'}
      className="h-full"
      share={() =>
        rankedSpec(
          `Top artists · ${stats.scopeLabel}`,
          'On heavy rotation',
          items.map((a) => ({
            rank: a.rank,
            primary: a.name,
            secondary: a.detail,
            value: a.value,
          })),
        )
      }
    >
      <RankedList
        rounded
        items={items.map((artist) => ({
          key: artist.key,
          rank: artist.rank,
          primary: artist.name,
          secondary: artist.detail,
          value: artist.value,
          imageUrl: artist.imageUrl,
          url: artist.url,
          share: () =>
            valueSpec(`Top artist · ${stats.scopeLabel}`, artist.name, artist.value, artist.detail),
        }))}
      />
    </SectionCard>
  )
}

export function TopTracksCard({ stats }: { stats: UnifiedStats }) {
  const items = stats.tracks.slice(0, LIMIT)

  return (
    <SectionCard
      title="Top tracks"
      icon={Music2}
      subtitle={stats.rankingLabel ?? 'Ranked by listening'}
      className="h-full"
      share={() =>
        rankedSpec(
          `Top tracks · ${stats.scopeLabel}`,
          'Songs on repeat',
          items.map((t) => ({
            rank: t.rank,
            primary: t.name,
            secondary: t.artist,
            value: t.value,
          })),
        )
      }
    >
      <RankedList
        items={items.map((track) => ({
          key: track.key,
          rank: track.rank,
          primary: track.name,
          secondary: track.detail,
          value: track.value,
          imageUrl: track.imageUrl,
          url: track.url,
          share: () =>
            valueSpec(`Top track · ${stats.scopeLabel}`, track.name, track.value, track.detail),
        }))}
      />
    </SectionCard>
  )
}

export function TopAlbumsCard({ stats }: { stats: UnifiedStats }) {
  const items = stats.albums.slice(0, LIMIT)

  return (
    <SectionCard
      title="Top albums"
      icon={Disc3}
      subtitle={stats.rankingLabel ?? 'Ranked by listening'}
      className="h-full"
      share={() =>
        rankedSpec(
          `Top albums · ${stats.scopeLabel}`,
          'Records I lived in',
          items.map((a) => ({
            rank: a.rank,
            primary: a.name,
            secondary: a.artist,
            value: a.value,
          })),
        )
      }
    >
      <RankedList
        items={items.map((album) => ({
          key: album.key,
          rank: album.rank,
          primary: album.name,
          secondary: album.detail,
          value: album.value,
          imageUrl: album.imageUrl,
          url: album.url,
          share: () =>
            valueSpec(`Top album · ${stats.scopeLabel}`, album.name, album.value, album.artist),
        }))}
      />
    </SectionCard>
  )
}
