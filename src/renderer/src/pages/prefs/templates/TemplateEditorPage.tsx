import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { OutputSection, PromptTemplate } from '../../../../../preload/index.d'
import { formatRelativeTime } from '../../../lib/relativeTime'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import InlineEditableText from './InlineEditableText'
import SystemPromptEditor from './SystemPromptEditor'
import OutputSectionList from './OutputSectionList'
import TemplateActionBar from './TemplateActionBar'
import DeleteTemplateDialog from './DeleteTemplateDialog'
import DiscardChangesDialog from './DiscardChangesDialog'

interface FormState {
  name: string
  systemPrompt: string
  outputSections: OutputSection[]
}

function toFormState(template: PromptTemplate): FormState {
  return {
    name: template.name,
    systemPrompt: template.systemPrompt,
    outputSections: template.outputSections
  }
}

export default function TemplateEditorPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<PromptTemplate | null | undefined>(undefined)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingBack, setPendingBack] = useState(false)
  const [previewState, setPreviewState] = useState<
    | { status: 'loading' }
    | { status: 'done'; markdown: string }
    | { status: 'error'; message: string }
    | null
  >(null)

  const { hasUnsavedChanges, markSaved } = useUnsavedChanges(form, null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    window.api.templates.get(id).then((t) => {
      if (cancelled) return
      setTemplate(t)
      if (t) {
        const fresh = toFormState(t)
        setForm(fresh)
        markSaved(fresh)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
      [hasUnsavedChanges]
    )
  )

  if (template === undefined) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading template…</p>
  }

  if (template === null || !form) {
    return (
      <div className="max-w-2xl">
        <BackLink onClick={() => navigate('/prefs/templates')} />
        <p className="text-sm text-[var(--color-text-muted)]">Template not found.</p>
      </div>
    )
  }

  const isBuiltIn = template.isBuiltIn

  const handleBack = (): void => {
    if (hasUnsavedChanges) {
      setPendingBack(true)
    } else {
      navigate('/prefs/templates')
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!id) return
    setSaving(true)
    setSaveError(null)
    try {
      const reindexed = form.outputSections.map((s, index) => ({ ...s, order: index }))
      const updated = await window.api.templates.update(id, {
        name: form.name || 'Untitled Template',
        systemPrompt: form.systemPrompt,
        outputSections: reindexed
      })
      setTemplate(updated)
      const nextForm = toFormState(updated)
      setForm(nextForm)
      markSaved(nextForm)
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    await window.api.templates.delete(id)
    navigate('/prefs/templates')
  }

  const handleDuplicate = async (): Promise<void> => {
    if (!id) return
    const created = await window.api.templates.duplicate(id)
    navigate(`/prefs/templates/${created.id}`)
  }

  const handlePreview = async (): Promise<void> => {
    if (!id) return
    setPreviewState({ status: 'loading' })
    try {
      const { markdown } = await window.api.templates.preview(id)
      setPreviewState({ status: 'done', markdown })
    } catch (err) {
      setPreviewState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate preview'
      })
    }
  }

  return (
    <div className="max-w-2xl flex flex-col">
      <BackLink onClick={handleBack} />

      <div className="flex items-baseline gap-2 mb-1">
        <InlineEditableText
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
          disabled={isBuiltIn}
          showEditIcon
          placeholder="Untitled Template"
          ariaLabel="Template name"
          data-testid="template-name"
          className="text-[18px] font-semibold"
        />
        {hasUnsavedChanges && !isBuiltIn && (
          <span
            aria-label="Unsaved changes"
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
          />
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        {isBuiltIn
          ? 'Built-in template (read-only)'
          : `Last edited ${formatRelativeTime(template.updatedAt)}`}
      </p>

      <section className="mb-6">
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">
          System Prompt
        </h3>
        <SystemPromptEditor
          value={form.systemPrompt}
          onChange={(systemPrompt) => setForm({ ...form, systemPrompt })}
          disabled={isBuiltIn}
        />
      </section>

      <section className="mb-6">
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1">
          Output Sections
        </h3>
        <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
          Drag to reorder. Each section becomes a heading in the generated summary.
        </p>
        <OutputSectionList
          sections={form.outputSections}
          disabled={isBuiltIn}
          onChange={(outputSections) => setForm({ ...form, outputSections })}
        />
      </section>

      {saveError && (
        <p className="text-xs text-[var(--color-error)] mb-2">Failed to save — {saveError}</p>
      )}
      {savedToast && <p className="text-xs text-[var(--color-success)] mb-2">Saved</p>}

      <TemplateActionBar
        isBuiltIn={isBuiltIn}
        isActive={template.isActive}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        onDelete={() => setShowDeleteDialog(true)}
        onPreview={() => void handlePreview()}
        onSave={() => void handleSave()}
        onDuplicate={() => void handleDuplicate()}
      />

      {showDeleteDialog && (
        <DeleteTemplateDialog
          templateName={template.name}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {(pendingBack || blocker.state === 'blocked') && (
        <DiscardChangesDialog
          onCancel={() => {
            setPendingBack(false)
            if (blocker.state === 'blocked') blocker.reset()
          }}
          onDiscard={() => {
            setPendingBack(false)
            if (blocker.state === 'blocked') {
              blocker.proceed()
            } else {
              navigate('/prefs/templates')
            }
          }}
        />
      )}

      {previewState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewState(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-[var(--radius-lg)]
              bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-[var(--shadow-3)] p-5"
          >
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Preview</h3>
            {previewState.status === 'loading' && (
              <p className="text-sm text-[var(--color-text-muted)]">Generating preview…</p>
            )}
            {previewState.status === 'error' && (
              <p className="text-sm text-[var(--color-error)]">{previewState.message}</p>
            )}
            {previewState.status === 'done' && (
              <pre className="text-[13px] whitespace-pre-wrap font-mono text-[var(--color-text-secondary)]">
                {previewState.markdown}
              </pre>
            )}
            <button
              type="button"
              onClick={() => setPreviewState(null)}
              className="mt-4 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium
                bg-[var(--color-bg-surface-hover)] text-[var(--color-text-secondary)]
                hover:text-[var(--color-text-primary)] transition-colors cursor-default"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]
        hover:text-[var(--color-text-primary)] transition-colors mb-4 cursor-default"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to templates
    </button>
  )
}
