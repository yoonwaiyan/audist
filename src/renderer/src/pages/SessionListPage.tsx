import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import Waveform from '../components/Waveform'
import type { LLMSettings, SessionMeta } from '../../../preload/index.d'

const PROVIDER_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'OpenAI-compatible'
}

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
// Session row
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptionProgress {
  percent: number
  stage: string
}

interface SessionRowProps {
  session: SessionMeta
  progress: TranscriptionProgress | null
  errorMessage: string | null
  isMissingBinary: boolean
}

function SessionRow({
  session,
  progress,
  errorMessage,
  isMissingBinary
}: SessionRowProps): React.JSX.Element {
  const isTranscribing = session.status === 'transcribing'
  const isError = session.status === 'error'

  const handleRetry = (): void => {
    void window.api.transcription.retry(session.dir)
  }

  const handleReinstall = (): void => {
    void window.location.assign('#/whisper-setup')
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-[var(--color-surface-panel)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-[var(--color-text-primary)]">
            {formatTimestamp(session.id)}
          </span>
          <span className={`text-xs ${STATUS_COLOR[session.status]}`}>
            {isTranscribing && progress
              ? `Transcribing… (${progress.percent}%)`
              : STATUS_LABEL[session.status]}
          </span>
        </div>
        <span className="text-sm text-[var(--color-text-secondary)] tabular-nums">
          {formatDuration(session.duration)}
        </span>
      </div>

      {/* Transcription progress bar */}
      {isTranscribing && progress !== null && (
        <div className="w-full h-1 bg-[var(--color-surface-overlay)] rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col gap-2">
          {errorMessage && (
            <p className="text-xs text-red-400 leading-relaxed">{errorMessage}</p>
          )}
          <div className="flex gap-2">
            {isMissingBinary ? (
              <button
                onClick={handleReinstall}
                className="text-xs px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white
                  hover:bg-[var(--color-accent-hover)] transition-colors cursor-default"
              >
                Reinstall Engine
              </button>
            ) : (
              <button
                onClick={handleRetry}
                className="text-xs px-3 py-1 rounded-lg bg-[var(--color-surface-overlay)]
                  text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]
                  transition-colors cursor-default"
              >
                Retry Transcription
              </button>
            )}
          </div>
        </div>
      )}
    </li>
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
  const [llmSettings, setLlmSettings] = useState<LLMSettings | null>(null)

  // Per-session live transcription state (not persisted — derived from IPC events)
  const [transcriptionProgress, setTranscriptionProgress] = useState<
    Record<string, TranscriptionProgress>
  >({})
  const [transcriptionErrors, setTranscriptionErrors] = useState<
    Record<string, { message: string; isMissingBinary: boolean }>
  >({})

  const loadSessions = useCallback(async () => {
    const list = await window.api.session.list()
    setSessions(list)
  }, [])

  // Load session list and LLM settings on mount
  useEffect(() => {
    loadSessions()
    void window.api.settings.getLLMSettings().then(setLlmSettings)
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

  // Transcription event listeners
  useEffect(() => {
    const unsubProgress = window.api.transcription.onProgress(({ sessionId, percent, stage }) => {
      setTranscriptionProgress((prev) => ({ ...prev, [sessionId]: { percent, stage } }))
      // Optimistically set status to transcribing in session list
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'transcribing' } : s))
      )
    })

    const unsubComplete = window.api.transcription.onComplete(({ sessionId }) => {
      setTranscriptionProgress((prev) => {
        const next = { ...prev }
        delete next[sessionId]
        return next
      })
      setTranscriptionErrors((prev) => {
        const next = { ...prev }
        delete next[sessionId]
        return next
      })
      loadSessions()
    })

    const unsubError = window.api.transcription.onError(({ sessionId, code, message }) => {
      setTranscriptionProgress((prev) => {
        const next = { ...prev }
        delete next[sessionId]
        return next
      })
      setTranscriptionErrors((prev) => ({
        ...prev,
        [sessionId]: { message, isMissingBinary: code === 'NO_BINARY' }
      }))
      // Reload so status badge updates to 'error'
      loadSessions()
    })

    return () => {
      unsubProgress()
      unsubComplete()
      unsubError()
    }
  }, [loadSessions])

  const handleStop = useCallback(() => {
    stopRecording(elapsed)
  }, [stopRecording, elapsed])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Recording controls */}
      <div className="flex flex-col items-center justify-center gap-6 py-8">
        <Waveform active={state === 'recording'} analyserRef={analyserRef} />

        {state === 'recording' && (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm -mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="tabular-nums font-mono">{formatElapsed(elapsed)}</span>
          </div>
        )}

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

        {error && <p className="text-xs text-red-400 max-w-xs text-center">{error}</p>}

        {/* LLM provider note */}
        {llmSettings !== null && (
          llmSettings.activeProvider ? (
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              Summarization via{' '}
              <span className="text-[var(--color-text-secondary)]">
                {PROVIDER_LABEL[llmSettings.activeProvider] ?? llmSettings.activeProvider}
              </span>
              {llmSettings.models?.[llmSettings.activeProvider] && (
                <>
                  {' · '}
                  <span className="text-[var(--color-text-secondary)] font-mono">
                    {llmSettings.models[llmSettings.activeProvider]}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              No AI provider configured —{' '}
              <button
                onClick={() => window.electron.ipcRenderer.send('audist:prefs:open', { section: 'llm' })}
                className="underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors cursor-default"
              >
                set one up in Preferences
              </button>
            </p>
          )
        )}
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
              <SessionRow
                key={session.id}
                session={session}
                progress={transcriptionProgress[session.id] ?? null}
                errorMessage={transcriptionErrors[session.id]?.message ?? session.error ?? null}
                isMissingBinary={transcriptionErrors[session.id]?.isMissingBinary ?? false}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
