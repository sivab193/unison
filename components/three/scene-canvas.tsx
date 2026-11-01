'use client'

import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useCan3D, useReducedMotion } from '@/lib/use-preferences'

interface SceneCanvasProps {
  children: ReactNode
  className?: string
  /** Rendered instead of the canvas when WebGL is unavailable or on mobile */
  fallback?: ReactNode
  camera?: { position: [number, number, number]; fov?: number }
}

export function SceneCanvas({ children, className, fallback = null, camera }: SceneCanvasProps) {
  const reducedMotion = useReducedMotion()
  const can3D = useCan3D()

  if (!can3D) return <>{fallback}</>

  return (
    <div className={cn('relative', className)}>
      <Canvas
        className="absolute inset-0"
        dpr={[1, 1.75]}
        camera={camera}
        frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
      >
        <AdaptiveDpr pixelated />
        {children}
        <Preload all />
      </Canvas>
    </div>
  )
}

/** Stable hue per title, so the same album always draws the same cover. */
function hashHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360
  return hash
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) return lines
    } else {
      line = next
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

/** Draws a stand-in sleeve for sources that ship no artwork (the ZIP export). */
function drawCover(title: string, subtitle: string): HTMLCanvasElement {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const hue = hashHue(`${title}${subtitle}`)

  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, `hsl(${hue}, 48%, 26%)`)
  gradient.addColorStop(1, `hsl(${(hue + 48) % 360}, 55%, 9%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = `hsla(${(hue + 120) % 360}, 70%, 60%, 0.16)`
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(size * (0.25 + i * 0.3), size * (0.2 + i * 0.22), size * (0.28 - i * 0.06), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, sans-serif'
  const lines = wrap(ctx, title, size - 80, 3)
  lines.forEach((line, i) => ctx.fillText(line, 40, 300 + i * 52))

  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.font = '30px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(wrap(ctx, subtitle, size - 80, 1)[0] ?? '', 40, 300 + lines.length * 52 + 18)

  return canvas
}

/**
 * Artwork when the source provides it, a generated sleeve when it doesn't —
 * so the album wall renders for API data and ZIP exports alike.
 */
export function useCoverTexture(url: string | null, title: string, subtitle: string) {
  const image = useImageTexture(url)
  const [generated, setGenerated] = useState<import('three').Texture | null>(null)

  useEffect(() => {
    if (url) return
    let disposed = false
    let texture: import('three').Texture | null = null
    import('three').then(({ CanvasTexture, SRGBColorSpace }) => {
      if (disposed) return
      texture = new CanvasTexture(drawCover(title, subtitle))
      texture.colorSpace = SRGBColorSpace
      setGenerated(texture)
    })
    return () => {
      disposed = true
      texture?.dispose()
      setGenerated(null)
    }
  }, [url, title, subtitle])

  return image ?? generated
}

/** Loads an image as a THREE texture without suspending; null while loading or on CORS failure. */
export function useImageTexture(url: string | null) {
  const [texture, setTexture] = useState<import('three').Texture | null>(null)

  useEffect(() => {
    if (!url) return
    let disposed = false
    let loaded: import('three').Texture | null = null
    import('three').then(({ TextureLoader, SRGBColorSpace }) => {
      if (disposed) return
      new TextureLoader().load(
        url,
        (tex) => {
          tex.colorSpace = SRGBColorSpace
          loaded = tex
          if (!disposed) setTexture(tex)
        },
        undefined,
        () => {
          /* CORS or network failure — caller falls back to a solid color */
        }
      )
    })
    return () => {
      disposed = true
      loaded?.dispose()
      setTexture(null)
    }
  }, [url])

  return texture
}
