import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FolderOpen, Copy, Check, Loader2, Sparkles, AlertTriangle, RefreshCw, Settings
} from 'lucide-react'
import type { SessionMeta } from '../../../preload/index.d'
import { Tooltip } from '../components/ui'

const TABS = ['Summary', 'Transcript'] as const

function formatTimestamp(id: string): { name: string; date: string; time: string } {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return { name: id, date: id, time: '' }
  const [, year, month, day, hour, min] = match
  const dt = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  const date = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const time = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return { name: `${date} Recording`, date, time }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function TranscriptParagraph({ text }: { text: string }): React.JSX.Element {
  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const match = line.match(/^(\[\d{2}:\d{2}:\d{2}\])\s+(\w[\w\s]*):\s+(.*)$/)
        if (match) {
          return (
            <span key={i} className="block">
              <span className="text-[var(--color-text-tertiary)]">{match[1]} </span>
              <span className="text-[var(--color-accent)] font-medium">{match[2]}: </span>
              <span className="text-[var(--color-text-primary)]">{match[3]}</span>
            </span>
          )
        }
        // fallback: timestamp-only line
        const tsOnly = line.match(/^(\[\d{2}:\d{2}:\d{2}\])\s*(.*)$/)
        if (tsOnly) {
          return (
            <span key={i} className="block">
              <span className="text-[var(--color-accent)] select-all">{tsOnly[1]} </span>
              <span className="text-[var(--color-text-muted)]">{tsOnly[2]}</span>
            </span>
          )
        }
        return (
          <span key={i} className="block text-[var(--color-text-muted)]">{line}</span>
        )
      })}
    </div>
  )
}

export default function SessionDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const [session, setSession] = useState<SessionMeta | null>(null)
  const [activeTab, setActiveTab] = useState<'Summary' | 'Transcript'>('Summary')
  const [summary, setSummary] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [summaryError, setSummaryError] = useState<{ code: string; message: string } | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)


  // Reset and load session whenever the route id changes
  useEffect(() => {
    if (!id) return
    setSession(null)
    setSummary(null)
    setTranscript(null)
    setSummaryError(null)
    setRetrying(false)

    const fromState = (location.state as { session?: SessionMeta } | null)?.session
    const seed = (s: SessionMeta): void => {
      setSession(s)
      // Restore persisted summary error across restarts
      if (s.status === 'error' && s.error && s.summaryErrorCode) {
        setSummaryError({ code: s.summaryErrorCode, message: s.error })
      }
    }
    if (fromState?.id === id) {
      seed(fromState)
      return
    }
    window.api.session.list().then((list) => {
      const found = list.find((s) => s.id === id)
      if (found) seed(found)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Load summary and transcript once we have the session dir
  useEffect(() => {
    if (!session) return
    window.api.summary.read(session.dir).then(setSummary)
    window.api.transcription.read(session.dir).then(setTranscript)
  }, [session?.dir])

  // Reload when background processing completes / errors
  useEffect(() => {
    if (!session) return
    const unsubSC = window.api.summary.onComplete(({ sessionId }) => {
      if (sessionId === session.id) {
        window.api.summary.read(session.dir).then(setSummary)
        setSession((prev) => prev ? { ...prev, status: 'complete' } : prev)
        setSummaryError(null)
        setRetrying(false)
      }
    })
    const unsubSE = window.api.summary.onError(({ sessionId, code, message }) => {
      if (sessionId === session.id) {
        setSummaryError({ code, message })
        setSession((prev) => prev ? { ...prev, status: 'error' } : prev)
        setRetrying(false)
      }
    })
    const unsubSP = window.api.summary.onProgress(({ sessionId }) => {
      if (sessionId === session.id) {
        setSummaryError(null)
        setSession((prev) => prev ? { ...prev, status: 'summarising' } : prev)
      }
    })
    const unsubTC = window.api.transcription.onComplete(({ sessionId }) => {
      if (sessionId === session.id) {
        window.api.transcription.read(session.dir).then(setTranscript)
      }
    })
    return () => { unsubSC(); unsubSE(); unsubSP(); unsubTC() }
  }, [session])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        Loading…
      </div>
    )
  }

  const { name: fallbackName, date, time } = formatTimestamp(session.id)
  const displayName = session.title ?? fallbackName
  const isTranscribed = session.status === 'complete' || session.status === 'summarising'
  const isSummarized = session.status === 'complete' && summary != null

  const handleCopy = (): void => {
    if (!summary) return
    void navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleOpenFolder = (): void => {
    void window.api.summary.openInFinder(session.dir)
  }

  const handleRetry = (): void => {
    if (!session) return
    setRetrying(true)
    void window.api.summary.retry(session.dir)
  }

  const handleOpenSettings = (): void => {
    window.electron.ipcRenderer.send('audist:prefs:open', { section: 'llm' })
  }

  const handleTitleClick = (): void => {
    setTitleValue(displayName)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  const handleTitleConfirm = (): void => {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== displayName) {
      void window.api.session.rename(session.dir, trimmed)
      setSession((prev) => prev ? { ...prev, title: trimmed } : prev)
    }
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleTitleConfirm()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Session header */}
      <div className="border-b border-[var(--color-border)] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleConfirm}
              onKeyDown={handleTitleKeyDown}
              className="text-[15px] font-semibold text-[var(--color-text-primary)] bg-transparent
                border-b border-[var(--color-accent)] outline-none truncate w-full"
              aria-label="Session title"
            />
          ) : (
            <h2
              role="button"
              tabIndex={0}
              onClick={handleTitleClick}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleClick()}
              title="Click to rename"
              className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate
                cursor-text hover:text-[var(--color-text-primary)] select-none"
            >
              {displayName}
            </h2>
          )}
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <Tooltip label="Reveal in Finder">
              <button
                aria-label="Reveal in Finder"
                onClick={handleOpenFolder}
                className="p-1.5 hover:bg-[var(--color-bg-surface-hover)] rounded transition-colors cursor-default"
              >
                <FolderOpen className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            </Tooltip>
            <Tooltip
              label="Copy summary to clipboard"
              open={copied || undefined}
            >
              <button
                aria-label="Copy summary"
                onClick={handleCopy}
                disabled={!summary}
                className="p-1.5 hover:bg-[var(--color-bg-surface-hover)] rounded transition-colors disabled:opacity-30 cursor-default"
              >
                {copied
                  ? <Check className="w-4 h-4 text-[var(--color-success)]" />
                  : <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                }
              </button>
            </Tooltip>

          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--color-text-primary)]/40">Recorded</span>
          <span className="text-[11px] text-[var(--color-text-primary)]/75">{date} · {time}</span>
          <span className="text-[var(--color-border)]/50 text-[10px]">·</span>
          <span className="text-[11px] text-[var(--color-text-primary)]/40">Duration</span>
          <span className="font-mono text-[11px] text-[var(--color-text-primary)]/75">
            {formatTime(session.duration)}
          </span>
          <span className="text-[var(--color-border)]/50 text-[10px]">·</span>

          {/* Transcription status */}
          {session.status === 'transcribing' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent-secondary)]/15 text-[var(--color-accent-secondary)] border border-[var(--color-accent-secondary)]/20">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Transcribing
            </span>
          ) : isTranscribed ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-success)]/12 text-[var(--color-success)] border border-[var(--color-success)]/20">
              <Check className="w-2.5 h-2.5" />
              Transcribed
            </span>
          ) : null}

          {session.status !== 'transcribing' && (
            <>
              <span className="text-[var(--color-border)]/50 text-[10px]">·</span>
              {session.status === 'summarising' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Summarising…
                </span>
              ) : isSummarized ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent)]/12 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Summarized
                </span>
              ) : null}
            </>
          )}

          {session.status === 'error' && (
            <span className="text-[11px] text-[var(--color-error)]">
              {session.error ?? 'Error'}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] px-5 flex gap-4 shrink-0 bg-[var(--color-bg-surface)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 text-sm font-medium border-b-2 transition-colors cursor-default ${
              activeTab === tab
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'Summary' && (
          summaryError ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-error)]/8 border border-[var(--color-error)]/20">
                <AlertTriangle className="w-4 h-4 text-[var(--color-error)] shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--color-error)] leading-relaxed select-text">
                  {summaryError.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium
                    bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                    text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-default"
                >
                  <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Retrying…' : 'Retry'}
                </button>
                {(summaryError.code === 'AUTH_ERROR' || summaryError.code === 'NO_PROVIDER') && (
                  <button
                    onClick={handleOpenSettings}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium
                      bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                      text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                      transition-colors cursor-default"
                  >
                    <Settings className="w-3 h-3" />
                    Open Settings
                  </button>
                )}
              </div>
            </div>
          ) : summary ? (
            <div className="prose prose-sm max-w-none text-[var(--color-text-primary)] [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-[var(--color-text-primary)] [&_h1]:mb-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-[var(--color-text-secondary)] [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:text-sm [&_p]:text-[var(--color-text-secondary)] [&_p]:mb-1 [&_li]:text-sm [&_li]:text-[var(--color-text-secondary)] [&_strong]:text-[var(--color-text-primary)] [&_a]:text-[var(--color-accent)] [&_hr]:border-[var(--color-border)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {session.status === 'summarising' ? 'Generating summary…' : 'No summary available.'}
            </p>
          )
        )}

        {activeTab === 'Transcript' && (
          transcript ? (
            <div className="font-mono text-sm leading-relaxed space-y-3">
              {transcript.split('\n\n').filter(Boolean).map((para, i) => (
                <TranscriptParagraph key={i} text={para} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {session.status === 'transcribing' ? 'Transcribing audio…' : 'No transcript available.'}
            </p>
          )
        )}
      </div>
    </div>
  )
}
