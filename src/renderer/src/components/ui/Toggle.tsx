interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled = false }: ToggleProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-3 cursor-default select-none">
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative w-9 h-5 rounded-[var(--radius-pill)] transition-colors duration-200',
          'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          ].join(' ')}
        />
      </button>
      {label && (
        <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
      )}
    </label>
  )
}
