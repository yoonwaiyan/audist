interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function TabBar({ tabs, value, onChange, className = '' }: TabBarProps): React.JSX.Element {
  return (
    <div className={`flex border-b border-[var(--color-border)] ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === value
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors cursor-default -mb-px border-b-2',
              isActive
                ? 'text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
            ].join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
