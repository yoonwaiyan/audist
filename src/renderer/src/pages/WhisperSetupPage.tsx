import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type BootstrapStage = 'idle' | 'installing' | 'downloading' | 'done' | 'error'

const STAGE_LABEL: Record<BootstrapStage, string> = {
  idle: 'Preparing…',
  installing: 'Installing whisper.cpp…',
  downloading: 'Downloading base model (~140 MB)…',
  done: 'Ready!',
  error: 'Setup failed'
}

export default function WhisperSetupPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [stage, setStage] = useState<BootstrapStage>('idle')
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const runInstall = useCallback(
    (unsubBootstrap: () => void, unsubReady: () => void) => {
      setStage('idle')
      setError(null)
      setPercent(0)
      window.api.whisper.install().catch((err: unknown) => {
        setStage('error')
        const raw = err instanceof Error ? err.message : String(err)
        const friendly = raw.includes('git clone')
          ? 'Failed to download whisper.cpp source. Check your internet connection and try again.'
          : raw.includes('make')
            ? 'Failed to compile whisper.cpp. Ensure Xcode Command Line Tools are installed:\n  xcode-select --install'
            : raw
        setError(friendly)
        // Re-register listeners for the next attempt
        unsubBootstrap()
        unsubReady()
      })
    },
    []
  )

  useEffect(() => {
    const unsubBootstrap = window.api.whisper.onBootstrap(({ stage: s, percent: p }) => {
      setStage(s as BootstrapStage)
      setPercent(p)
    })

    const unsubReady = window.api.whisper.onReady(() => {
      setStage('done')
      setPercent(100)
      setTimeout(() => navigate('/'), 600)
    })

    runInstall(unsubBootstrap, unsubReady)

    return () => {
      unsubBootstrap()
      unsubReady()
    }
  }, [navigate, runInstall])

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg-base)] px-8">
      {/* Reserve space for macOS traffic lights */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--color-accent)]"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Setting up transcription engine…
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            This only happens once. Audist is downloading the speech recognition model — it won't
            need internet access after this.
          </p>
        </div>

        {/* Progress bar */}
        {stage !== 'error' && (
          <div className="w-full flex flex-col gap-2">
            <div className="w-full h-2 bg-[var(--color-bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {STAGE_LABEL[stage]}
              {stage === 'downloading' && percent > 0 && ` (${percent}%)`}
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-[var(--color-error)] max-w-xs text-center whitespace-pre-line">{error}</p>
            <button
              onClick={() => runInstall(
                window.api.whisper.onBootstrap(({ stage: s, percent: p }) => { setStage(s as BootstrapStage); setPercent(p) }),
                window.api.whisper.onReady(() => { setStage('done'); setPercent(100); setTimeout(() => navigate('/'), 600) })
              )}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
                hover:bg-[var(--color-accent-hover)] transition-colors cursor-default"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
