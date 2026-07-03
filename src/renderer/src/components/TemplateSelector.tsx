import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTemplates } from '../hooks/useTemplates'

interface TemplateSelectorProps {
  /** Per-session override. `null` means "use the global active template". */
  selectedTemplateId: string | null
  onSelectTemplate: (id: string) => void
}

/**
 * Compact dropdown for picking a per-session Afterword (prompt template) override.
 * Lives in the main recording view, near the recording controls. Selecting a
 * template here does NOT change the global active template — it only affects
 * the session about to be (or currently being) recorded.
 */
export default function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate
}: TemplateSelectorProps): React.JSX.Element | null {
  const { templates, isLoading } = useTemplates()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (isLoading || templates.length === 0) return null

  const activeTemplate = templates.find((t) => t.isActive) ?? templates[0]
  const currentId = selectedTemplateId ?? activeTemplate.id
  const currentTemplate = templates.find((t) => t.id === currentId) ?? activeTemplate

  const handleSelect = (id: string): void => {
    onSelectTemplate(id)
    setOpen(false)
  }

  const handleManageTemplates = (): void => {
    setOpen(false)
    window.electron.ipcRenderer.send('audist:prefs:open', { section: 'templates' })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] text-[12.5px] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40 transition-colors cursor-default"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-medium">{currentTemplate.name}</span>
        <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 min-w-[220px] bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] rounded-lg p-1 z-50"
          style={{ boxShadow: 'var(--shadow-3)' }}
        >
          {templates.map((template) => (
            <button
              key={template.id}
              role="option"
              aria-selected={template.id === currentId}
              onClick={() => handleSelect(template.id)}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-[13px] text-[var(--color-text-primary)] flex items-center gap-2.5 transition-colors cursor-default"
              style={{
                background:
                  template.id === currentId ? 'var(--color-bg-surface-hover)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (template.id !== currentId) {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'var(--color-bg-surface-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (template.id !== currentId) {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <span className="flex-1">{template.name}</span>
              {template.id === currentId && (
                <span className="text-[var(--color-accent)] text-xs">✓</span>
              )}
            </button>
          ))}
          <div className="h-px bg-[var(--color-border)] my-1" />
          <button
            onClick={handleManageTemplates}
            className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
          >
            Manage Templates...
          </button>
        </div>
      )}
    </div>
  )
}
