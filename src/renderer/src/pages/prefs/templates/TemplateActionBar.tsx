interface TemplateActionBarProps {
  isBuiltIn: boolean
  isActive: boolean
  hasUnsavedChanges: boolean
  saving: boolean
  onDelete: () => void
  onPreview: () => void
  onSave: () => void
  onDuplicate: () => void
}

export default function TemplateActionBar({
  isBuiltIn,
  isActive,
  hasUnsavedChanges,
  saving,
  onDelete,
  onPreview,
  onSave,
  onDuplicate
}: TemplateActionBarProps): React.JSX.Element {
  return (
    <div
      className="sticky bottom-0 flex items-center justify-between gap-3 px-1 py-3 mt-6
        border-t border-[var(--color-border)] bg-[var(--color-bg-base)]"
    >
      <div>
        {!isBuiltIn &&
          (isActive ? (
            <span
              title="Switch to another template before deleting this one."
              className="text-xs font-medium text-[var(--color-text-tertiary)] cursor-not-allowed"
            >
              Delete Template
            </span>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-medium text-[var(--color-error)]
                hover:text-[var(--color-error)]/80 transition-colors cursor-default"
            >
              Delete Template
            </button>
          ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
            border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]
            hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]
            transition-colors cursor-default"
        >
          Preview
        </button>

        {isBuiltIn ? (
          <button
            type="button"
            onClick={onDuplicate}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
              bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]
              transition-colors cursor-default"
          >
            Duplicate & Customise
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={!hasUnsavedChanges || saving}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
              bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]
              disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-default"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  )
}
