interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'text'
  size?: 'sm' | 'md'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const BASE = 'inline-flex items-center justify-center font-medium transition-colors cursor-default select-none disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANT = {
  primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
  ghost: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]',
  text: 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
}

const SIZE = {
  sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-sm)]',
  md: 'text-sm px-4 py-2 rounded-[var(--radius-sm)]'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  type = 'button',
  className = ''
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
