'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 → target with an ease-out curve. Honors
 * prefers-reduced-motion (snaps straight to the target). Re-runs when `target`
 * changes so filter switches re-animate.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) {
      frame.current = requestAnimationFrame(() => setValue(target))
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current)
      }
    }

    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.max(0, Math.min((now - start) / durationMs, 1))
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, durationMs])

  return value
}
