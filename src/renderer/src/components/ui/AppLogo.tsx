interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

const SIZE = {
  sm: { icon: 24, wordmark: 'text-lg' },
  md: { icon: 36, wordmark: 'text-2xl' },
  lg: { icon: 60, wordmark: 'text-4xl' }
} as const

export default function AppLogo({ size = 'md', showWordmark = true }: AppLogoProps): React.JSX.Element {
  const { icon: iconSize, wordmark } = SIZE[size]

  return (
    <div className="flex items-center gap-3">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="3" y="10" width="2" height="4" rx="1" fill="var(--color-accent)" />
        <rect x="7" y="6" width="2" height="12" rx="1" fill="var(--color-accent)" />
        <rect x="11" y="4" width="2" height="16" rx="1" fill="var(--color-accent)" />
        <rect x="15" y="8" width="2" height="8" rx="1" fill="var(--color-accent)" />
        <rect x="19" y="11" width="2" height="2" rx="1" fill="var(--color-accent)" />
      </svg>

      {showWordmark && (
        <span className={`font-bold text-[var(--color-text-primary)] tracking-tight leading-none ${wordmark}`}>
          audist
        </span>
      )}
    </div>
  )
}
