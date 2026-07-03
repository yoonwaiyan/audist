interface PillBadgeProps {
  variant: 'active' | 'built-in'
  children: React.ReactNode
}

const VARIANT = {
  active: 'bg-[var(--color-accent)] text-white',
  'built-in':
    'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border-strong)]'
}

export default function PillBadge({ variant, children }: PillBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-semibold tracking-wide uppercase ${VARIANT[variant]}`}
    >
      {children}
    </span>
  )
}
