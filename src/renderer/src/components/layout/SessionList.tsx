import { useCallback, useEffect, useState } from 'react'
import type { SessionMeta } from '../../../../preload/index.d'
import { useRecorderContext } from '../../contexts/RecorderContext'
import SessionListItem from './SessionListItem'

interface SessionListProps {
  activeSessionId?: string | null
  onSelectSession: (session: SessionMeta) => void
}

export default function SessionList({ activeSessionId, onSelectSession }: SessionListProps): React.JSX.Element {
  const { state: recorderState } = useRecorderContext()
  const [sessions, setSessions] = useState<SessionMeta[]>([])

  const reload = useCallback(async () => {
    const list = await window.api.session.list()
    setSessions(list)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Reload when recording stops (a new session has been written)
  useEffect(() => {
    if (recorderState === 'idle') reload()
  }, [recorderState, reload])

  // Reload when transcription/summary events settle
  useEffect(() => {
    const unsubTC = window.api.transcription.onComplete(() => reload())
    const unsubTE = window.api.transcription.onError(() => reload())
    const unsubSC = window.api.summary.onComplete(() => reload())
    const unsubSE = window.api.summary.onError(() => reload())
    return () => { unsubTC(); unsubTE(); unsubSC(); unsubSE() }
  }, [reload])

  const isRecording = recorderState === 'recording' || recorderState === 'stopping'

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* In-progress recording item */}
      {isRecording && (
        <div className="flex items-start gap-2.5 px-[10px] py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-error)]/10 border-l-2 border-[var(--color-error)]">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--color-error)] animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Recording…</p>
            <p className="text-xs text-[var(--color-text-muted)]">New session</p>
          </div>
        </div>
      )}

      {sessions.length === 0 && !isRecording ? (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-6 px-3">
          No recordings yet
        </p>
      ) : (
        sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            onClick={() => onSelectSession(session)}
          />
        ))
      )}
    </div>
  )
}
