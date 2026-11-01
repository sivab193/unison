// Renders shareable PNG cards on a <canvas> — no DOM capture, so the app's
// oklch theme tokens and fonts never trip up the export. Produces a clean,
// on-brand card that drops straight into the WhatsApp / IG share sheet on
// mobile, or downloads on desktop.

export interface ShareRow {
  rank?: number
  primary: string
  secondary?: string
  value: string
}

export interface ShareStat {
  label: string
  value: string
}

export interface ShareSpec {
  variant: 'tile' | 'story'
  eyebrow?: string
  title: string
  bigValue?: string
  bigCaption?: string
  rows?: ShareRow[]
  stats?: ShareStat[]
}

const GREEN = '#1db954'
const GREEN_LIGHT = '#4dd07a'
const INK = '#f3f5f4'
const MUTED = '#8b968f'
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const W = 1080

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight = 800,
): number {
  let px = startPx
  do {
    ctx.font = `${weight} ${px}px ${FONT}`
    if (ctx.measureText(text).width <= maxWidth) break
    px -= 6
  } while (px > 40)
  return px
}

function background(ctx: CanvasRenderingContext2D, h: number) {
  const base = ctx.createLinearGradient(0, 0, W, h)
  base.addColorStop(0, '#0a0f0d')
  base.addColorStop(1, '#05100b')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, h)

  // Green aurora glow, top-left
  const glow = ctx.createRadialGradient(210, 150, 40, 210, 150, 720)
  glow.addColorStop(0, 'rgba(29,185,84,0.34)')
  glow.addColorStop(1, 'rgba(29,185,84,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, h)

  // Cool counter-glow, bottom-right
  const glow2 = ctx.createRadialGradient(W - 120, h - 160, 40, W - 120, h - 160, 640)
  glow2.addColorStop(0, 'rgba(58,107,208,0.20)')
  glow2.addColorStop(1, 'rgba(58,107,208,0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, h)

  // Faint dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  for (let y = 80; y < h; y += 54) {
    for (let x = 40; x < W; x += 54) {
      ctx.beginPath()
      ctx.arc(x, y, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function equalizer(ctx: CanvasRenderingContext2D, y: number) {
  const bars = 34
  const gap = 8
  const bw = (W - 96 - gap * (bars - 1)) / bars
  for (let i = 0; i < bars; i++) {
    const h = 14 + (Math.sin(i * 0.9) * 0.5 + 0.5) * 74
    ctx.fillStyle = i % 3 === 0 ? GREEN : 'rgba(29,185,84,0.35)'
    roundRect(ctx, 48 + i * (bw + gap), y - h, bw, h, bw / 2)
    ctx.fill()
  }
}

function brandFooter(ctx: CanvasRenderingContext2D, h: number) {
  ctx.textAlign = 'left'
  ctx.font = `800 30px ${FONT}`
  ctx.fillStyle = GREEN
  ctx.fillText('◆ UNISON', 48, h - 52)
  ctx.textAlign = 'right'
  ctx.font = `600 26px ${FONT}`
  ctx.fillStyle = MUTED
  ctx.fillText('music.siv19.dev', W - 48, h - 52)
  ctx.textAlign = 'left'
}

function drawEyebrow(ctx: CanvasRenderingContext2D, text: string, y: number) {
  ctx.font = `700 30px ${FONT}`
  ctx.fillStyle = GREEN_LIGHT
  ctx.textAlign = 'left'
  ctx.fillText(text.toUpperCase(), 48, y)
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, y: number): number {
  const px = fitFont(ctx, title, W - 96, 74, 800)
  ctx.fillStyle = INK
  ctx.font = `800 ${px}px ${FONT}`
  ctx.fillText(truncate(ctx, title, W - 96), 48, y)
  return px
}

function drawRows(ctx: CanvasRenderingContext2D, rows: ShareRow[], top: number, rowH: number) {
  rows.forEach((row, i) => {
    const y = top + i * rowH
    roundRect(ctx, 48, y, W - 96, rowH - 16, 22)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()

    let x = 76
    if (row.rank !== undefined) {
      ctx.font = `800 40px ${FONT}`
      ctx.fillStyle = GREEN
      ctx.textAlign = 'left'
      ctx.fillText(`${row.rank}`, x, y + (rowH - 16) / 2 + 14)
      x += 62
    }

    ctx.textAlign = 'right'
    ctx.font = `800 38px ${FONT}`
    ctx.fillStyle = GREEN_LIGHT
    const valW = ctx.measureText(row.value).width
    ctx.fillText(row.value, W - 76, y + (rowH - 16) / 2 + (row.secondary ? -2 : 14))

    ctx.textAlign = 'left'
    const textMax = W - 76 - valW - 40 - x
    ctx.font = `700 40px ${FONT}`
    ctx.fillStyle = INK
    ctx.fillText(
      truncate(ctx, row.primary, textMax),
      x,
      y + (rowH - 16) / 2 + (row.secondary ? -8 : 14),
    )
    if (row.secondary) {
      ctx.font = `500 30px ${FONT}`
      ctx.fillStyle = MUTED
      ctx.fillText(truncate(ctx, row.secondary, textMax), x, y + (rowH - 16) / 2 + 34)
    }
  })
}

function drawStatGrid(ctx: CanvasRenderingContext2D, stats: ShareStat[], top: number) {
  const cols = 2
  const cellW = (W - 96 - 24) / cols
  const cellH = 150
  stats.slice(0, 4).forEach((s, i) => {
    const cx = 48 + (i % cols) * (cellW + 24)
    const cy = top + Math.floor(i / cols) * (cellH + 24)
    roundRect(ctx, cx, cy, cellW, cellH, 26)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.textAlign = 'left'
    const vpx = fitFont(ctx, s.value, cellW - 56, 60, 800)
    ctx.font = `800 ${vpx}px ${FONT}`
    ctx.fillStyle = INK
    ctx.fillText(s.value, cx + 28, cy + 74)
    ctx.font = `600 26px ${FONT}`
    ctx.fillStyle = MUTED
    ctx.fillText(truncate(ctx, s.label.toUpperCase(), cellW - 56), cx + 28, cy + 116)
  })
}

/** Render a spec to a fully-drawn canvas at 2× for crisp exports. */
export function renderCard(spec: ShareSpec): HTMLCanvasElement {
  const h = spec.variant === 'story' ? 1920 : 1350
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  background(ctx, h)

  let y = 150
  if (spec.eyebrow) {
    drawEyebrow(ctx, spec.eyebrow, y)
    y += 60
  }
  drawTitle(ctx, spec.title, y + 30)
  y += 90

  if (spec.bigValue) {
    y += 40
    const px = fitFont(ctx, spec.bigValue, W - 96, 220, 800)
    ctx.font = `800 ${px}px ${FONT}`
    const grad = ctx.createLinearGradient(48, y, 48, y + px)
    grad.addColorStop(0, GREEN_LIGHT)
    grad.addColorStop(1, GREEN)
    ctx.fillStyle = grad
    ctx.textAlign = 'left'
    const baseline = y + px * 0.8
    ctx.fillText(spec.bigValue, 48, baseline)
    // Descenders hang below the baseline, and at 150px+ they hang a long way —
    // a fixed gap put the caption straight through the "p" in "Tame Impala".
    // Measure the actual ink instead of assuming the value is digits.
    const descent = ctx.measureText(spec.bigValue).actualBoundingBoxDescent || 0
    y = baseline + descent
    if (spec.bigCaption) {
      const captionBaseline = y + 52
      ctx.font = `600 40px ${FONT}`
      ctx.fillStyle = MUTED
      ctx.fillText(truncate(ctx, spec.bigCaption, W - 96), 48, captionBaseline)
      y = captionBaseline + 30
    } else {
      y += 20
    }
  }

  if (spec.rows?.length) {
    y += 40
    const rowH = spec.variant === 'story' ? 118 : 128
    drawRows(ctx, spec.rows, y, rowH)
    y += spec.rows.length * rowH + 20
  }

  if (spec.stats?.length) {
    y += 30
    drawStatGrid(ctx, spec.stats, y)
  }

  equalizer(ctx, h - 130)
  brandFooter(ctx, h)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

/**
 * Share via the Web Share API (opens WhatsApp/IG/etc. on mobile) with a
 * download fallback on desktop. Returns how it was handled.
 */
export async function shareCard(
  spec: ShareSpec,
  opts: { filename?: string; text?: string } = {},
): Promise<'shared' | 'downloaded'> {
  const canvas = renderCard(spec)
  const blob = await canvasToBlob(canvas)
  const filename = opts.filename ?? 'statify.png'
  const file = new File([blob], filename, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text: opts.text })
      return 'shared'
    } catch (err) {
      // User cancelled the sheet — don't fall through to a download.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
