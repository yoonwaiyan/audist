interface NavItem {
  id: string
  label: string
  icon?: React.ReactNode
}

interface PreferencesNavProps {
  items: NavItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function PreferencesNav({ items, value, onChange, className = '' }: PreferencesNavProps): React.JSX.Element {
  return (
    <nav className={`flex flex-col gap-0.5 ${className}`}>
      {items.map((item) => {
        const isActive = item.id === value
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors cursor-default text-left w-full',
              isActive
                ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)]'
            ].join(' ')}
          >
            {item.icon && (
              <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
