interface VariableChipProps {
  token: string
  onClick: (token: string) => void
  disabled?: boolean
}

export default function VariableChip({
  token,
  onClick,
  disabled = false
}: VariableChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(token)}
      className="px-2 py-1 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)]
        text-[12px] font-mono text-[var(--color-text-secondary)]
        hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-text-primary)]
        hover:border-[var(--color-accent)] active:scale-[0.97]
        disabled:opacity-50 disabled:pointer-events-none
        transition-colors cursor-default"
    >
      {token}
    </button>
  )
}
