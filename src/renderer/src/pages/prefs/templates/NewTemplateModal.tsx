interface NewTemplateModalProps {
  onClose: () => void
}

/**
 * Placeholder for the full template creation modal.
 * Full creation flow (name/description/sections form, validation, save) is AUD-62.
 */
export default function NewTemplateModal({ onClose }: NewTemplateModalProps): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-80 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)]
          border border-[var(--color-border)] shadow-[var(--shadow-3)] p-5"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          New Template
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Template creation is coming soon.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
            bg-[var(--color-bg-surface-hover)] text-[var(--color-text-secondary)]
            hover:text-[var(--color-text-primary)] transition-colors cursor-default"
        >
          Close
        </button>
      </div>
    </div>
  )
}
