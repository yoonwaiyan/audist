import { useEffect, useRef, useState } from 'react'
import { Check, Copy, MoreHorizontal, Trash2 } from 'lucide-react'
import type { PromptTemplate } from '../../../../../preload/index.d'

interface TemplateOverflowMenuProps {
  template: PromptTemplate
  onSetActive: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export default function TemplateOverflowMenu({
  template,
  onSetActive,
  onDuplicate,
  onDelete
}: TemplateOverflowMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmingDelete(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const close = (): void => {
    setOpen(false)
    setConfirmingDelete(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Template actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
          hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-56 bg-[var(--color-bg-surface)] border border-[var(--color-border)]
            rounded-[var(--radius-md)] shadow-[var(--shadow-2)] py-1 z-50"
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                Delete this template? This can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(template.id)
                    close()
                  }}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-[var(--color-error)] text-white
                    hover:bg-[var(--color-error)]/90 transition-colors cursor-default"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-[var(--color-bg-surface-hover)]
                    text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-default"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={template.isActive}
                onClick={() => {
                  onSetActive(template.id)
                  close()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                  text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]
                  disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors cursor-default"
              >
                <Check
                  className={`w-3.5 h-3.5 ${template.isActive ? 'opacity-100' : 'opacity-0'}`}
                />
                Set as Active
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicate(template.id)
                  close()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                  text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
              >
                <Copy className="w-3.5 h-3.5" />
                {template.isBuiltIn ? 'Duplicate & Customise' : 'Duplicate'}
              </button>

              {!template.isBuiltIn && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                      text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors cursor-default"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
