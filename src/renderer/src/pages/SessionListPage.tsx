import { useEffect, useRef, useState } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import Waveform from '../components/Waveform'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function RecordIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}

function StopIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SessionListPage(): React.JSX.Element {
  const { state, error, analyserRef, startRecording, stopRecording } = useRecorder()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state === 'recording') {
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (state === 'idle') setElapsed(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Waveform — visible while recording, flat bars when idle */}
      <Waveform active={state === 'recording'} analyserRef={analyserRef} />

      {/* Elapsed timer — only shown while recording */}
      {state === 'recording' && (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm -mt-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="tabular-nums font-mono">{formatElapsed(elapsed)}</span>
        </div>
      )}

      {/* Main record/stop button */}
      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
            text-white font-medium text-sm transition-colors cursor-default select-none"
        >
          <RecordIcon />
          Start Recording
        </button>
      )}

      {state === 'recording' && (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500
            text-white font-medium text-sm transition-colors cursor-default select-none"
        >
          <StopIcon />
          Stop Recording
        </button>
      )}

      {state === 'stopping' && (
        <button
          disabled
          className="flex items-center gap-2 px-6 py-3 rounded-xl
            bg-[var(--color-surface-panel)] text-[var(--color-text-muted)]
            font-medium text-sm cursor-default select-none opacity-60"
        >
          Stopping…
        </button>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-red-400 max-w-xs text-center">{error}</p>}
    </div>
  )
}
