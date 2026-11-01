'use client'

import { useSyncExternalStore } from 'react'

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}

/**
 * Whether to render a 3D scene at all: false on mobile or without WebGL.
 * useSyncExternalStore keeps the server snapshot hydration-safe.
 */
export function useCan3D(): boolean {
  const isMobile = useIsMobile()
  const webgl = useSyncExternalStore(
    () => () => {},
    hasWebGL,
    () => false,
  )
  return webgl && !isMobile
}

let webglSupport: boolean | null = null

export function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas')
      webglSupport = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}
