import { useEffect, useState } from 'react'

export default function GeneralPrefsPage(): React.JSX.Element {
  const [saveDir, setSaveDir] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    window.api.directory.get().then((dir) => {
      setSaveDir(dir)
      setLoading(false)
    })
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

  return (
    <div>
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-6">General</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
          Save Folder
        </label>

        <div className="flex items-center gap-2 mt-1">
          <span
            className="flex-1 text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-surface)]
              border border-[var(--color-border)] rounded-md px-3 py-2 truncate min-w-0"
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
            className="shrink-0 px-3 py-2 rounded-md text-sm font-medium
              bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)]
              hover:bg-[var(--color-border)] transition-colors disabled:opacity-50
              disabled:cursor-not-allowed cursor-default"
          >
            {picking ? 'Opening…' : 'Change…'}
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Each recording session creates a timestamped subfolder inside this directory.
        </p>
      </div>
    </div>
  )
}
