import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTemplates } from '../../../hooks/useTemplates'
import TemplateCard from './TemplateCard'
import NewTemplateModal from './NewTemplateModal'

export default function TemplateListPage(): React.JSX.Element {
  const { templates, isLoading } = useTemplates()
  const navigate = useNavigate()
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)

  const hasCustomTemplate = templates.some((t) => !t.isBuiltIn)

  const handleSetActive = (id: string): void => {
    void window.api.templates.setActive(id)
  }

  const handleDuplicate = (id: string): void => {
    void window.api.templates.duplicate(id)
  }

  const handleDelete = (id: string): void => {
    void window.api.templates.delete(id)
  }

  const handleOpen = (id: string): void => {
    navigate(`/prefs/templates/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Prompt Templates
        </h2>
        <button
          type="button"
          onClick={() => setShowNewTemplateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)]
            bg-[var(--color-accent)] text-white text-xs font-medium
            hover:bg-[var(--color-accent-hover)] transition-colors cursor-default"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading templates…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onOpen={handleOpen}
              onSetActive={handleSetActive}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}

          {!hasCustomTemplate && (
            <div
              className="mt-2 px-4 py-3.5 rounded-[var(--radius-md)] border border-dashed
                border-[var(--color-border)] text-[13px] text-[var(--color-text-muted)]"
            >
              Create your first custom template to tailor summaries to your workflow.
            </div>
          )}
        </div>
      )}

      {showNewTemplateModal && <NewTemplateModal onClose={() => setShowNewTemplateModal(false)} />}
    </div>
  )
}
