interface DiscardChangesDialogProps {
  onCancel: () => void
  onDiscard: () => void
}

export default function DiscardChangesDialog({
  onCancel,
  onDiscard
}: DiscardChangesDialogProps): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Discard changes?"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)]
          border border-[var(--color-border)] shadow-[var(--shadow-3)] p-5"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
          Discard changes?
        </h3>
        <p className="text-[13px] text-[var(--color-text-muted)] mb-4">
          You have unsaved changes. Discard and go back?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
              bg-[var(--color-bg-surface-hover)] text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] transition-colors cursor-default"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
              bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90
              transition-colors cursor-default"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
