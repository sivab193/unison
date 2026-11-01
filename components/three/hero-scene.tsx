'use client'

import { useRef, type ComponentRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'
import { SceneCanvas } from './scene-canvas'
import { useReducedMotion } from '@/lib/use-preferences'

function PulsingBlob() {
  const material = useRef<ComponentRef<typeof MeshDistortMaterial>>(null)
  const reducedMotion = useReducedMotion()

  useFrame(({ clock }) => {
    if (reducedMotion || !material.current) return
    // Sine pulse like a slow audio visualizer
    material.current.distort = 0.38 + Math.sin(clock.elapsedTime * 1.4) * 0.1
  })

  return (
    <Float speed={reducedMotion ? 0 : 1.6} rotationIntensity={0.5} floatIntensity={0.7}>
      <mesh>
        <icosahedronGeometry args={[1.7, 48]} />
        <MeshDistortMaterial
          ref={material}
          color="#8b8cf8"
          roughness={0.18}
          metalness={0.35}
          distort={0.38}
          speed={reducedMotion ? 0 : 2}
        />
      </mesh>
    </Float>
  )
}

function HeroFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" aria-hidden>
      <div className="w-64 h-64 rounded-full bg-primary/25 blur-3xl" />
    </div>
  )
}

export default function HeroScene({ className }: { className?: string }) {
  return (
    <SceneCanvas
      className={className}
      camera={{ position: [0, 0, 5], fov: 45 }}
      fallback={<HeroFallback />}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 4, 5]} intensity={45} color="#4dd07a" />
      <pointLight position={[-5, -2, 3]} intensity={30} color="#3a6bd0" />
      <pointLight position={[0, -5, -4]} intensity={18} color="#8a4dd0" />
      <PulsingBlob />
    </SceneCanvas>
  )
}
