import { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'

interface Step2SaveLocationProps {
  onNext: () => void
  onBack: () => void
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function Step2SaveLocation({ onNext, onBack }: Step2SaveLocationProps): React.JSX.Element {
  const [savePath, setSavePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    window.api.directory.get().then((dir) => {
      setSavePath(dir)
      setLoading(false)
    })
  }, [])

  const handleChange = async (): Promise<void> => {
    setPicking(true)
    try {
      const result = await window.api.directory.select()
      if (result.path !== null) {
        setSavePath(result.path)
      }
    } finally {
      setPicking(false)
    }
  }

  const sessionFolder = savePath ? `${savePath}/2026-03-19_meeting` : null

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Where should Audist save your recordings?
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Choose a folder where Audist will store recordings, transcripts, and summaries.
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-base)] border border-[var(--color-border)]">
          <span className="text-[var(--color-text-secondary)] shrink-0">
            <FolderIcon />
          </span>
          <span className="flex-1 text-sm font-mono text-[var(--color-text-primary)] truncate min-w-0">
            {loading ? (
              <span className="text-[var(--color-text-muted)]">Loading…</span>
            ) : savePath ? (
              savePath
            ) : (
              <span className="text-[var(--color-text-muted)]">No folder selected</span>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={handleChange} loading={picking}>
            Change…
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-muted)]">
            Each session gets its own timestamped subfolder:
          </p>
          <pre className="text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-sm)] p-3 overflow-x-auto">
{savePath
  ? `${savePath}/\n  ${sessionFolder?.split('/').pop()}/\n    recording.m4a\n    transcript.txt\n    summary.md`
  : '<your folder>/\n  2026-03-19_meeting/\n    recording.m4a\n    transcript.txt\n    summary.md'
}</pre>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} disabled={savePath === null || loading}>
          Continue
        </Button>
      </div>
    </div>
  )
}
