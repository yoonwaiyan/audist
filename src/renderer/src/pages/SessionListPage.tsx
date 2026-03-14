import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  complete: 'text-[var(--color-success)]',
  transcribing: 'text-blue-400',
  summarising: 'text-[var(--color-accent)]',
  error: 'text-[var(--color-error)]'
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
  summaryContent: string | null
  summaryLoading: boolean
}

function SessionRow({
  session,
  progress,
  errorMessage,
  isMissingBinary,
  summaryContent,
  summaryLoading
}: SessionRowProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const isTranscribing = session.status === 'transcribing'
  const isSummarising = session.status === 'summarising'
  const isComplete = session.status === 'complete'
  const isError = session.status === 'error'
  const hasSummary = isComplete && summaryContent !== null

  const handleRetry = (): void => {
    void window.api.transcription.retry(session.dir)
  }

  const handleReinstall = (): void => {
    void window.location.assign('#/whisper-setup')
  }

  const handleOpenInFinder = (): void => {
    void window.api.summary.openInFinder(session.dir)
  }

  const handleCopy = (): void => {
    if (summaryContent) void navigator.clipboard.writeText(summaryContent)
  }

  const handleToggle = (): void => {
    if (hasSummary || summaryLoading) setExpanded((v) => !v)
  }

  return (
    <li className="flex flex-col rounded-xl bg-[var(--color-bg-surface)] overflow-hidden">
      {/* Header row */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${hasSummary || summaryLoading ? 'cursor-default' : ''}`}
        onClick={handleToggle}
      >
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)] tabular-nums">
            {formatDuration(session.duration)}
          </span>
          {(hasSummary || summaryLoading) && (
            <span className="text-[var(--color-text-muted)] text-xs select-none">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Transcription progress bar */}
      {isTranscribing && progress !== null && (
        <div className="mx-4 mb-3 h-1 bg-[var(--color-bg-base)] rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}

      {/* Summarising indicator */}
      {isSummarising && (
        <p className="px-4 pb-3 text-xs text-[var(--color-accent)]">Generating summary…</p>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col gap-2 px-4 pb-3">
          {errorMessage && (
            <p className="text-xs text-[var(--color-error)] leading-relaxed">{errorMessage}</p>
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
                className="text-xs px-3 py-1 rounded-lg bg-[var(--color-bg-base)]
                  text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)]
                  transition-colors cursor-default"
              >
                Retry Transcription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded summary */}
      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          {summaryLoading && !summaryContent ? (
            <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">Loading summary…</p>
          ) : summaryContent ? (
            <>
              <div className="px-4 py-3 prose prose-sm prose-invert max-w-none
                [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-[var(--color-text-primary)] [&_h1]:mt-0 [&_h1]:mb-2
                [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-[var(--color-text-secondary)] [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_p]:text-xs [&_p]:text-[var(--color-text-secondary)] [&_p]:leading-relaxed [&_p]:my-1
                [&_ul]:text-xs [&_ul]:text-[var(--color-text-secondary)] [&_ul]:pl-4 [&_ul]:my-1
                [&_ol]:text-xs [&_ol]:text-[var(--color-text-secondary)] [&_ol]:pl-4 [&_ol]:my-1
                [&_li]:my-0.5 [&_li]:leading-relaxed
                [&_strong]:text-[var(--color-text-primary)] [&_strong]:font-medium
                [&_input[type=checkbox]]:mr-1.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summaryContent}
                </ReactMarkdown>
              </div>
              <div className="flex gap-2 px-4 pb-3 border-t border-[var(--color-border)] pt-2">
                <button
                  onClick={handleOpenInFinder}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-bg-base)]
                    border border-[var(--color-border)] text-[var(--color-text-secondary)]
                    hover:text-[var(--color-text-primary)] transition-colors cursor-default"
                >
                  Open in Finder
                </button>
                <button
                  onClick={handleCopy}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-bg-base)]
                    border border-[var(--color-border)] text-[var(--color-text-secondary)]
                    hover:text-[var(--color-text-primary)] transition-colors cursor-default"
                >
                  Copy text
                </button>
              </div>
            </>
          ) : null}
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

  // Per-session summary content (loaded on demand and refreshed via IPC events)
  const [summaryContent, setSummaryContent] = useState<Record<string, string | null>>({})
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({})

  const loadSessions = useCallback(async () => {
    const list = await window.api.session.list()
    setSessions(list)
    // Load cached summaries for complete sessions
    const complete = list.filter((s) => s.status === 'complete')
    if (complete.length === 0) return
    setSummaryLoading(Object.fromEntries(complete.map((s) => [s.id, true])))
    const results = await Promise.all(
      complete.map(async (s) => ({ id: s.id, content: await window.api.summary.read(s.dir) }))
    )
    setSummaryContent(Object.fromEntries(results.map((r) => [r.id, r.content])))
    setSummaryLoading({})
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

    const unsubSummaryProgress = window.api.summary.onProgress(({ sessionId }) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'summarising' } : s))
      )
    })

    const unsubSummaryComplete = window.api.summary.onComplete(({ sessionId }) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'complete' } : s))
      )
      // Fetch the freshly written summary
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        void window.api.summary.read(session.dir).then((content) => {
          setSummaryContent((prev) => ({ ...prev, [sessionId]: content }))
        })
      }
    })

    const unsubSummaryError = window.api.summary.onError(({ sessionId }) => {
      // Summary failed but transcription succeeded — reload to get latest status
      loadSessions()
      setSummaryContent((prev) => ({ ...prev, [sessionId]: null }))
    })

    return () => {
      unsubProgress()
      unsubComplete()
      unsubError()
      unsubSummaryProgress()
      unsubSummaryComplete()
      unsubSummaryError()
    }
  }, [loadSessions, sessions])

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
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-error)] animate-pulse" />
            <span className="tabular-nums font-mono">{formatElapsed(elapsed)}</span>
          </div>
        )}

        {state === 'idle' && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-success)] hover:bg-[var(--color-success)]/90
              text-white font-medium text-sm transition-colors cursor-default select-none"
          >
            <RecordIcon />
            Start Recording
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-error)] hover:bg-[var(--color-error)]/90
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
              bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]
              font-medium text-sm cursor-default select-none opacity-60"
          >
            Stopping…
          </button>
        )}

        {error && <p className="text-xs text-[var(--color-error)] max-w-xs text-center">{error}</p>}

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
                summaryContent={summaryContent[session.id] ?? null}
                summaryLoading={summaryLoading[session.id] ?? false}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
