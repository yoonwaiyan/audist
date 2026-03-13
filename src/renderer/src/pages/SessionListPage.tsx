import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import Waveform from '../components/Waveform'
import type { SessionMeta } from '../../../preload/index.d'

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTimestamp(id: string): string {
  // id format: YYYY-MM-DD_HH-MM-SS
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return id
  const [, year, month, day, hour, min] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const STATUS_LABEL: Record<SessionMeta['status'], string> = {
  complete: 'Complete',
  transcribing: 'Transcribing',
  summarising: 'Summarising',
  error: 'Error'
}

const STATUS_COLOR: Record<SessionMeta['status'], string> = {
  complete: 'text-emerald-400',
  transcribing: 'text-blue-400',
  summarising: 'text-violet-400',
  error: 'text-red-400'
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
  const [sessions, setSessions] = useState<SessionMeta[]>([])

  const loadSessions = useCallback(async () => {
    const list = await window.api.session.list()
    setSessions(list)
  }, [])

  // Load session list on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Timer and post-stop refresh
  useEffect(() => {
    if (state === 'recording') {
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (state === 'idle') {
        setElapsed(0)
        loadSessions()
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state, loadSessions])

  const handleStop = useCallback(() => {
    stopRecording(elapsed)
  }, [stopRecording, elapsed])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Recording controls */}
      <div className="flex flex-col items-center justify-center gap-6 py-8">
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
            onClick={handleStop}
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

      {/* Divider */}
      <div className="border-t border-[var(--color-border)] mx-4" />

      {/* Session history */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {sessions.length === 0 ? (
          <p className="text-center text-[var(--color-text-muted)] text-sm mt-8">
            No recordings yet. Press Start to begin.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl
                  bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-hover)]
                  cursor-default select-none transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {formatTimestamp(session.id)}
                  </span>
                  <span className={`text-xs ${STATUS_COLOR[session.status]}`}>
                    {STATUS_LABEL[session.status]}
                  </span>
                </div>
                <span className="text-sm text-[var(--color-text-secondary)] tabular-nums">
                  {formatDuration(session.duration)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
