interface PresetCardProps {
  icon: string
  name: string
  description: string
  onClick: () => void
}

/** A single built-in preset option inside NewTemplateModal's 2x2 grid. */
export default function PresetCard({
  icon,
  name,
  description,
  onClick
}: PresetCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 p-3 rounded-[var(--radius-md)] text-left
        border border-[var(--color-border)] bg-[var(--color-bg-surface)]
        hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-hover)]
        transition-colors cursor-default"
    >
      <span className="text-lg leading-none" aria-hidden>
        {icon}
      </span>
      <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{name}</span>
      <span className="text-[12px] text-[var(--color-text-muted)]">{description}</span>
    </button>
  )
}
