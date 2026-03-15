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
        <div className="mx-3 my-2 px-4 py-2.5 rounded-md bg-[var(--color-recording)]/10 border border-[var(--color-recording)]/20">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-recording)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-recording)]" />
            </span>
            <span className="text-xs font-medium text-[var(--color-recording)]">Recording…</span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] pl-4">New session</p>
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
