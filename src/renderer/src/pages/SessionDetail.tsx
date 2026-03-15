import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FolderOpen, Copy, Check, Loader2, Sparkles, MoreHorizontal
} from 'lucide-react'
import type { SessionMeta } from '../../../preload/index.d'

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


  // Reset and load session whenever the route id changes
  useEffect(() => {
    if (!id) return
    setSession(null)
    setSummary(null)
    setTranscript(null)

    const fromState = (location.state as { session?: SessionMeta } | null)?.session
    if (fromState?.id === id) {
      setSession(fromState)
      return
    }
    window.api.session.list().then((list) => {
      const found = list.find((s) => s.id === id)
      if (found) setSession(found)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Load summary and transcript once we have the session dir
  useEffect(() => {
    if (!session) return
    window.api.summary.read(session.dir).then(setSummary)
    window.api.transcription.read(session.dir).then(setTranscript)
  }, [session?.dir])

  // Reload when background processing completes
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

  const { name, date, time } = formatTimestamp(session.id)
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
      {/* Session header */}
      <div className="border-b border-[var(--color-border)] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
            {name}
          </h2>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              onClick={handleOpenFolder}
              title="Reveal in Finder"
              className="p-1.5 hover:bg-[var(--color-bg-surface-hover)] rounded transition-colors cursor-default"
            >
              <FolderOpen className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy summary'}
              disabled={!summary}
              className="p-1.5 hover:bg-[var(--color-bg-surface-hover)] rounded transition-colors disabled:opacity-30 cursor-default"
            >
              <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
            <button className="p-1.5 hover:bg-[var(--color-bg-surface-hover)] rounded transition-colors cursor-default">
              <MoreHorizontal className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--color-text-primary)]/60">{date}</span>
          <span className="text-[var(--color-border)]/50 text-[10px]">·</span>
          <span className="text-[11px] text-[var(--color-text-primary)]/60">{time}</span>
          <span className="text-[var(--color-border)]/50 text-[10px]">·</span>
          <span className="font-mono text-[11px] text-[var(--color-text-primary)]/60">
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
          summary ? (
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
