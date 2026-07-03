import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Placeholder editor view. The full editor (sections, live preview, save/cancel) is
 * a separate ticket; this page exists so the list view's "open template" navigation
 * has somewhere to land.
 */
export default function TemplateEditorPage(): React.JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/prefs/templates')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]
          hover:text-[var(--color-text-primary)] transition-colors mb-4 cursor-default"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to templates
      </button>
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
        Template Editor
      </h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        Editing template <span className="font-mono">{id}</span> is coming soon.
      </p>
    </div>
  )
}
