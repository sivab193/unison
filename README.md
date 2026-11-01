# Unison — Your Listening, Unpacked

Unison turns a Spotify, Apple Music, or YouTube Music export ZIP into a private, explorable lifetime recap. Parsing, filtering, aggregation, and share-card generation happen in the browser. There is no account login, music-service API, server upload, or analytics request.

## Supported exports

- **Spotify:** Extended Streaming History and basic Account Data ZIPs.
- **Apple Music:** Apple Media Services ZIPs containing Play Activity, Play History Daily Tracks, or Recently Played Tracks CSV files. Nested archives are opened automatically.
- **YouTube Music:** Google Takeout ZIPs containing `watch-history.html` or `watch-history.json`. Regular YouTube watches are ignored.

YouTube Takeout records play events but not listening duration. Unison therefore ranks and charts YouTube Music history by play count and does not estimate duration or skip rate.

## What it shows

- Artist Galaxy and Album Wall, with 2D/reduced-motion fallbacks
- Top artists, tracks, and albums where the export includes album data
- Listening clock, weekday split, yearly and monthly trends, seasons, and discovery history
- Listening streaks, record days, repeat offenders, taste evolution, loyalty, and session patterns
- Year and device filters when those dimensions exist in the source export
- Downloadable/shareable recap images generated locally with canvas

## Local setup

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). No environment variables or platform credentials are required.

Validation commands:

```bash
pnpm lint
pnpm build
```

## Architecture

- `lib/streaming-history/worker.ts` opens ZIPs off the main thread and routes each platform to its parser.
- `apple.ts` and `youtube.ts` normalize platform exports to the common `Play[]` shape.
- `aggregate.ts` recomputes stats under local filters; unknown durations stay nullable.
- `lib/unified/from-local.ts` adapts aggregates into the single `UnifiedStats` dashboard model.
- `components/stats/*` renders the same dashboard for every supported export.

The uploaded ZIP exists only in the browser tab's memory and is discarded when the tab closes or another export is chosen.
