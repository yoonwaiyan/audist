import { useCallback, useEffect, useMemo, useState } from 'react'
import { isToday } from 'date-fns'
import type { SessionMeta } from '../../../../preload/index.d'
import { useRecorderContext } from '../../contexts/RecorderContext'
import { useKeybindings } from '../../hooks/useKeybindings'
import SessionListItem from './SessionListItem'

interface SessionListProps {
  activeSessionId?: string | null
  onSelectSession: (session: SessionMeta) => void
  searchQuery?: string
}

function sessionDate(id: string): Date | null {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, min, sec] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec))
}

export default function SessionList({ activeSessionId, onSelectSession, searchQuery = '' }: SessionListProps): React.JSX.Element {
  const { state: recorderState } = useRecorderContext()
  const [sessions, setSessions] = useState<SessionMeta[]>([])

  const reload = useCallback(async () => {
    const list = await window.api.session.list()
    setSessions(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (recorderState === 'idle') reload()
  }, [recorderState, reload])

  useEffect(() => {
    const unsubTC = window.api.transcription.onComplete(() => reload())
    const unsubTE = window.api.transcription.onError(() => reload())
    const unsubSC = window.api.summary.onComplete(() => reload())
    const unsubSE = window.api.summary.onError(() => reload())
    return () => { unsubTC(); unsubTE(); unsubSC(); unsubSE() }
  }, [reload])

  useEffect(() => {
    return window.api.session.onRenamed(({ sessionDir, title }) => {
      setSessions((prev) =>
        prev.map((s) => (s.dir === sessionDir ? { ...s, title } : s))
      )
    })
  }, [])

  const isRecording = recorderState === 'recording' || recorderState === 'stopping'

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter((s) => {
      const name = s.title ?? s.id
      return name.toLowerCase().includes(q)
    })
  }, [sessions, searchQuery])

  // Group into Today / Earlier
  const { today, earlier } = useMemo(() => {
    const t: SessionMeta[] = []
    const e: SessionMeta[] = []
    for (const s of filtered) {
      const dt = sessionDate(s.id)
      if (dt && isToday(dt)) t.push(s)
      else e.push(s)
    }
    return { today: t, earlier: e }
  }, [filtered])

  const completeSessions = sessions.filter((s) => s.status === 'complete')

  useKeybindings({
    SESSION_SELECT_NEXT: () => {
      if (completeSessions.length === 0) return
      const idx = completeSessions.findIndex((s) => s.id === activeSessionId)
      const next = completeSessions[idx + 1] ?? completeSessions[0]
      onSelectSession(next)
    },
    SESSION_SELECT_PREV: () => {
      if (completeSessions.length === 0) return
      const idx = completeSessions.findIndex((s) => s.id === activeSessionId)
      const prev = completeSessions[idx - 1] ?? completeSessions[completeSessions.length - 1]
      onSelectSession(prev)
    }
  })

  return (
    <div className="flex flex-col gap-0 px-1.5 pb-2 pt-1">
      {/* In-progress recording item */}
      {isRecording && (
        <div className="mx-1 my-1.5 px-3 py-2 rounded-md bg-[var(--color-recording-dim)] border border-[var(--color-recording)]/35 flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-recording)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-recording)]" />
          </span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-[var(--color-text-primary)]">Recording now</div>
            <div className="text-[11px] font-mono text-[var(--color-recording)] mt-0.5">In progress…</div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !isRecording ? (
        searchQuery ? (
          <p className="text-[11.5px] text-[var(--color-text-muted)] text-center py-6 px-3">
            No matches for "{searchQuery}"
          </p>
        ) : (
          <p className="text-[11.5px] text-[var(--color-text-muted)] text-center py-6 px-3">
            No recordings yet
          </p>
        )
      ) : (
        <>
          {today.length > 0 && (
            <>
              <SectionLabel label="Today" />
              {today.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  onClick={() => onSelectSession(session)}
                />
              ))}
            </>
          )}
          {earlier.length > 0 && (
            <>
              <SectionLabel label={today.length > 0 ? 'Earlier' : 'Recent'} />
              {earlier.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  onClick={() => onSelectSession(session)}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}

function SectionLabel({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="px-2.5 pt-3 pb-1 text-[10.5px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.6px]">
      {label}
    </div>
  )
}
