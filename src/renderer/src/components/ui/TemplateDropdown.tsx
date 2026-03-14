import { useEffect, useRef, useState } from 'react'

interface Template {
  id: string
  name: string
}

interface TemplateDropdownProps {
  templates: Template[]
  value: string
  onChange: (id: string) => void
  onManage: () => void
}

function ChevronIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function TemplateDropdown({ templates, value, onChange, onManage }: TemplateDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedTemplate = templates.find((t) => t.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50 transition-colors cursor-default"
      >
        <span className="text-[var(--color-text-muted)]">Template:</span>
        <span className="font-medium">{selectedTemplate?.name ?? 'Select…'}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-full w-56 z-50 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg overflow-hidden">
          <ul className="py-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => { onChange(t.id); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
                >
                  {t.name}
                  {t.id === value && <CheckIcon />}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-[var(--color-border)]">
            <button
              onClick={() => { onManage(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
            >
              Manage Templates →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
