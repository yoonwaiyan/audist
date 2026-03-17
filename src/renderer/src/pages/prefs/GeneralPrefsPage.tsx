import { useEffect, useState } from 'react'
import { Folder } from 'lucide-react'

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps): React.JSX.Element {
  return (
    <div className="py-4 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-default
            ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-surface-hover)] border border-[var(--color-border)]'}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
              ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </div>
  )
}

export default function GeneralPrefsPage(): React.JSX.Element {
  const [saveDir, setSaveDir] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)
  const [summarisationEnabled, setSummarisationEnabled] = useState(true)

  useEffect(() => {
    window.api.directory.get().then((dir) => {
      setSaveDir(dir)
      setLoading(false)
    })
    window.api.settings.getSummarisationEnabled().then(setSummarisationEnabled)
  }, [])

  const handleChange = async (): Promise<void> => {
    setPicking(true)
    try {
      const selected = await window.api.directory.select()
      if (selected) setSaveDir(selected)
    } finally {
      setPicking(false)
    }
  }

  const handleSummarisationChange = (enabled: boolean): void => {
    setSummarisationEnabled(enabled)
    void window.api.settings.setSummarisationEnabled(enabled)
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-6">General</h2>

      {/* Save Directory */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Save directory
        </label>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg
            bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
        >
          <Folder className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
          <span
            className="flex-1 text-sm font-mono text-[var(--color-text-primary)] truncate min-w-0"
            title={saveDir ?? undefined}
          >
            {loading ? (
              <span className="text-[var(--color-text-muted)]">Loading…</span>
            ) : saveDir ? (
              saveDir
            ) : (
              <span className="text-[var(--color-text-muted)]">Not set</span>
            )}
          </span>
          <button
            onClick={handleChange}
            disabled={picking}
            className="shrink-0 px-3 py-1.5 rounded text-xs font-medium
              bg-[var(--color-bg-base)] border border-[var(--color-border)]
              text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              hover:border-[var(--color-accent)]/50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
          >
            {picking ? 'Opening…' : 'Change…'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Each session creates a subfolder with the audio file, transcript, and summary.
        </p>
      </div>

      {/* Toggles */}
      <div className="mt-2">
        <ToggleRow
          label="Enable summarisation"
          description="Automatically generate AI summaries after transcription completes"
          checked={summarisationEnabled}
          onChange={handleSummarisationChange}
        />
      </div>
    </div>
  )
}
