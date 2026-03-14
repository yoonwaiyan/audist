interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

const SIZE = {
  sm: { bars: 16, gap: 2, wordmark: 'text-sm' },
  md: { bars: 24, gap: 3, wordmark: 'text-lg' },
  lg: { bars: 32, gap: 4, wordmark: 'text-2xl' }
} as const

// Bar heights as fractions of total height (5 bars, varying)
const BAR_HEIGHTS = [0.5, 0.8, 1.0, 0.65, 0.4]

export default function AppLogo({ size = 'md', showWordmark = true }: AppLogoProps): React.JSX.Element {
  const { bars: h, gap, wordmark } = SIZE[size]
  const w = Math.round(h * 0.2) // bar width proportional to height
  const totalWidth = BAR_HEIGHTS.length * w + (BAR_HEIGHTS.length - 1) * gap

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={totalWidth}
        height={h}
        viewBox={`0 0 ${totalWidth} ${h}`}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveform-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-hover)" />
          </linearGradient>
        </defs>
        {BAR_HEIGHTS.map((frac, i) => {
          const barH = Math.round(h * frac)
          const x = i * (w + gap)
          const y = h - barH
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={barH}
              rx={Math.round(w / 2)}
              fill="url(#waveform-grad)"
            />
          )
        })}
      </svg>

      {showWordmark && (
        <span className={`font-bold text-[var(--color-text-primary)] leading-none ${wordmark}`}>
          audist
        </span>
      )}
    </div>
  )
}
