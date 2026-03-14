interface ProviderCardProps {
  name: string
  description: string
  selected: boolean
  onClick: () => void
}

export default function ProviderCard({ name, description, selected, onClick }: ProviderCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left p-4 rounded-[var(--radius-md)] border transition-colors cursor-default',
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)]/50'
      ].join(' ')}
    >
      <p className={`text-sm font-medium ${selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'}`}>
        {name}
      </p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
    </button>
  )
}
