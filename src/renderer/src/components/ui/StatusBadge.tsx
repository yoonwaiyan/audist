export type StatusBadgeVariant =
  | 'transcribed'
  | 'summarized'
  | 'granted'
  | 'denied'
  | 'not-yet-granted'
  | 'built-in'
  | 'default'
  | 'live'

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  className?: string
}

const LABEL: Record<StatusBadgeVariant, string> = {
  transcribed: 'Transcribed',
  summarized: 'Summarized',
  granted: 'Granted',
  denied: 'Denied',
  'not-yet-granted': 'Not Yet Granted',
  'built-in': 'Built-In',
  default: 'Default',
  live: 'Live'
}

const STYLE: Record<StatusBadgeVariant, string> = {
  transcribed: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  summarized: 'bg-[var(--color-accent)] text-white',
  granted: 'border border-[var(--color-success)] text-[var(--color-success)]',
  denied: 'border border-[var(--color-warning)] text-[var(--color-warning)]',
  'not-yet-granted': 'border border-[var(--color-warning)] text-[var(--color-warning)]',
  'built-in': 'border border-[var(--color-border)] text-[var(--color-text-muted)]',
  default: 'border border-[var(--color-accent)] text-[var(--color-accent)]',
  live: 'text-[var(--color-accent)]'
}

export default function StatusBadge({ variant, className = '' }: StatusBadgeProps): React.JSX.Element {
  if (variant === 'live') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STYLE.live} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
        {LABEL.live}
      </span>
    )
  }

  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)]',
        'text-xs font-medium uppercase tracking-wide',
        STYLE[variant],
        className
      ].join(' ')}
    >
      {LABEL[variant]}
    </span>
  )
}
