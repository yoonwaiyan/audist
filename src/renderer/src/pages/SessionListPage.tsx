import { AppLogo } from '../components/ui'
import { useRecorderContext } from '../contexts/RecorderContext'

function MicIcon(): React.JSX.Element {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

export default function SessionListPage(): React.JSX.Element {
  const { startRecording, error } = useRecorderContext()

  const handleStart = (): void => {
    void startRecording()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 select-none">
      {/* Logo */}
      <AppLogo size="lg" />

      {/* Mic button */}
      <button
        onClick={handleStart}
        className="w-[120px] h-[120px] rounded-full flex items-center justify-center bg-[var(--color-bg-surface)] border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
        aria-label="Start recording"
      >
        <MicIcon />
      </button>

      <p className="text-sm text-[var(--color-text-muted)]">Click to start recording</p>

      {/* Static waveform placeholder */}
      <div className="flex items-end gap-[3px] h-6">
        {[0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3].map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-[var(--color-border)]"
            style={{ height: `${Math.round(h * 20)}px` }}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)] max-w-xs text-center">{error}</p>
      )}
    </div>
  )
}
