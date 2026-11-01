import { cn } from '@/lib/utils'

/**
 * Unison mark — a five-bar sound-wave peak. Self-contained (green gradient
 * squircle + white bars) so it reads on any background and scales to a 16px
 * favicon. Matches /public/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Unison logo"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="unison-mark-grad" x1="8" y1="6" x2="92" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26E06B" />
          <stop offset="1" stopColor="#0FA34A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="26" fill="url(#unison-mark-grad)" />
      <g fill="#ffffff">
        <rect x="15" y="34" width="10" height="32" rx="5" opacity="0.85" />
        <rect x="30" y="22" width="10" height="56" rx="5" opacity="0.95" />
        <rect x="45" y="12" width="10" height="76" rx="5" />
        <rect x="60" y="22" width="10" height="56" rx="5" opacity="0.95" />
        <rect x="75" y="34" width="10" height="32" rx="5" opacity="0.85" />
      </g>
    </svg>
  )
}

/** Mark + "Unison" wordmark, for nav bars and headers. */
export function Logo({
  className,
  markClassName,
  showText = true,
}: {
  className?: string
  markClassName?: string
  showText?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-8 w-8 rounded-[22%] shadow-sm shadow-primary/20', markClassName)} />
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          Uni<span className="text-primary">son</span>
        </span>
      )}
    </span>
  )
}
