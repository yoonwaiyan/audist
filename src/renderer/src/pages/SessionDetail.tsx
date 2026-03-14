import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TabBar, StatusBadge } from '../components/ui'
import type { SessionMeta } from '../../../preload/index.d'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'transcript', label: 'Transcript' }
]

function FolderIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CopyIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function formatTimestamp(id: string): { date: string; time: string } {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return { date: id, time: '' }
  const [, year, month, day, hour, min] = match
  const dt = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  return {
    date: dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Render a transcript line like "[00:01:34] some text" with accent-coloured timestamps
function TranscriptLine({ line }: { line: string }): React.JSX.Element {
  const match = line.match(/^(\[\d{2}:\d{2}:\d{2}\])\s*(.*)$/)
  if (!match) return <p className="text-[var(--color-text-muted)]">{line}</p>
  const [, ts, text] = match
  return (
    <p>
      <span className="text-[var(--color-accent)] select-all">{ts}</span>
      {' '}
      <span className="text-[var(--color-text-muted)]">{text}</span>
    </p>
  )
}

export default function SessionDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const sessionFromState = (location.state as { session?: SessionMeta } | null)?.session

  const [session, setSession] = useState<SessionMeta | null>(sessionFromState ?? null)
  const [activeTab, setActiveTab] = useState('summary')
  const [summary, setSummary] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // If session wasn't passed via state (e.g. deep link), find it from the list
  useEffect(() => {
    if (session || !id) return
    window.api.session.list().then((list) => {
      const found = list.find((s) => s.id === id)
      if (found) setSession(found)
    })
  }, [id, session])

  // Load summary and transcript once we have session dir
  useEffect(() => {
    if (!session) return
    window.api.summary.read(session.dir).then(setSummary)
    window.api.transcription.read(session.dir).then(setTranscript)
  }, [session])

  // Reload summary/transcript when background processing completes
  useEffect(() => {
    if (!session) return
    const unsubSC = window.api.summary.onComplete(({ sessionId }) => {
      if (sessionId === session.id) {
        window.api.summary.read(session.dir).then(setSummary)
        setSession((prev) => prev ? { ...prev, status: 'complete' } : prev)
      }
    })
    const unsubTC = window.api.transcription.onComplete(({ sessionId }) => {
      if (sessionId === session.id) {
        window.api.transcription.read(session.dir).then(setTranscript)
      }
    })
    return () => { unsubSC(); unsubTC() }
  }, [session])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        Loading…
      </div>
    )
  }

  const { date, time } = formatTimestamp(session.id)
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 shrink-0 border-b border-[var(--color-border)]">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] leading-snug">
            {date} Recording
          </h1>
          {/* Action icons */}
          <div className="flex items-center gap-1 pt-0.5 shrink-0">
            <button
              onClick={handleOpenFolder}
              title="Open in Finder"
              className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors cursor-default"
            >
              <FolderIcon />
            </button>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy summary'}
              disabled={!summary}
              className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] disabled:opacity-30 transition-colors cursor-default"
            >
              <CopyIcon />
            </button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--color-text-muted)]">
          <span>{date}</span>
          <span aria-hidden="true">·</span>
          <span>{time}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(session.duration)}</span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-2">
          {isTranscribed && <StatusBadge variant="transcribed" />}
          {isSummarized && <StatusBadge variant="summarized" />}
          {session.status === 'transcribing' && (
            <span className="text-xs text-[var(--color-text-muted)] animate-pulse">Transcribing…</span>
          )}
          {session.status === 'summarising' && (
            <span className="text-xs text-[var(--color-text-muted)] animate-pulse">Summarising…</span>
          )}
          {session.status === 'error' && (
            <span className="text-xs text-[var(--color-error)]">{session.error ?? 'Error'}</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <TabBar
        tabs={TABS}
        value={activeTab}
        onChange={setActiveTab}
        className="px-6 shrink-0"
      />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'summary' && (
          summary ? (
            <div className="prose prose-sm max-w-none text-[var(--color-text-primary)] [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[var(--color-text-primary)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--color-text-primary)] [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-[var(--color-text-primary)] [&_p]:text-[var(--color-text-muted)] [&_li]:text-[var(--color-text-muted)] [&_strong]:text-[var(--color-text-primary)] [&_a]:text-[var(--color-accent)] [&_hr]:border-[var(--color-border)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {session.status === 'summarising' ? 'Generating summary…' : 'No summary available.'}
            </p>
          )
        )}

        {activeTab === 'transcript' && (
          transcript ? (
            <div className="font-mono text-xs leading-relaxed space-y-1">
              {transcript.split('\n').filter(Boolean).map((line, i) => (
                <TranscriptLine key={i} line={line} />
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
