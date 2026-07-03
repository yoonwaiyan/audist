import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, X } from 'lucide-react'
import type { PromptTemplate } from '../../../../../preload/index.d'
import PresetCard from './PresetCard'

interface NewTemplateModalProps {
  templates: PromptTemplate[]
  onClose: () => void
}

// Emoji per built-in template id, per the AUD-65 Figma brief. Falls back to a generic
// document icon for any built-in not covered here so the grid never renders empty.
const PRESET_ICONS: Record<string, string> = {
  'builtin-default': '📄',
  'builtin-standup': '📋',
  'builtin-1on1': '🤝',
  'builtin-client-discovery': '🔍'
}

/**
 * Modal shown from the template list's "+ New Template" button. Offers two paths:
 * a blank template, or duplicating one of the built-in presets. Closing without a
 * selection (×, outside click, Escape) creates nothing.
 */
export default function NewTemplateModal({
  templates,
  onClose
}: NewTemplateModalProps): React.JSX.Element {
  const navigate = useNavigate()
  const presets = templates.filter((t) => t.isBuiltIn)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleBlank = async (): Promise<void> => {
    const created = await window.api.templates.create({})
    onClose()
    navigate(`/prefs/templates/${created.id}`)
  }

  const handlePreset = async (presetId: string): Promise<void> => {
    const created = await window.api.templates.duplicate(presetId)
    onClose()
    navigate(`/prefs/templates/${created.id}`)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a new template"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)]
          border border-[var(--color-border)] shadow-[var(--shadow-3)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Create a new template
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded text-[var(--color-text-muted)]
              hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]
              transition-colors cursor-default"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleBlank()}
          className="w-full flex items-center gap-3 p-3 mb-4 rounded-[var(--radius-md)] text-left
            border border-[var(--color-border)] bg-[var(--color-bg-surface)]
            hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-hover)]
            transition-colors cursor-default"
        >
          <FileText className="w-5 h-5 shrink-0 text-[var(--color-text-secondary)]" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Blank template</p>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Start with an empty prompt and build your own sections.
            </p>
          </div>
        </button>

        <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
          Start from a preset
        </p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              icon={PRESET_ICONS[preset.id] ?? '📄'}
              name={preset.name}
              description={preset.description}
              onClick={() => void handlePreset(preset.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
