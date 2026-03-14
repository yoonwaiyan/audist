import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AppLogo } from '../ui'
import { RecorderProvider, useRecorderContext } from '../../contexts/RecorderContext'
import SessionList from './SessionList'
import RecordingPage from '../../pages/RecordingPage'
import type { SessionMeta } from '../../../../preload/index.d'

function GearIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function AppShellInner(): React.JSX.Element {
  const navigate = useNavigate()
  const { state: recorderState } = useRecorderContext()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const isRecording = recorderState === 'recording' || recorderState === 'stopping'

  // Re-check permissions on window focus
  useEffect(() => {
    const handleFocus = async (): Promise<void> => {
      const perms = await window.api.permissions.check()
      if (perms.microphone !== 'granted' || perms.screen !== 'granted') {
        navigate('/permissions')
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [navigate])

  const handleNewRecording = (): void => {
    navigate('/')
  }

  const handleSelectSession = (session: SessionMeta): void => {
    setActiveSessionId(session.id)
    navigate(`/sessions/${session.id}`, { state: { session } })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — 265px fixed */}
      <aside className="w-[265px] shrink-0 flex flex-col bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)]">
        {/* Logo — pt accounts for macOS traffic lights (hiddenInset) */}
        <div className="pt-[52px] px-4 pb-3 [-webkit-app-region:drag]">
          <AppLogo size="sm" />
        </div>

        {/* Session list — scrollable */}
        <div className="flex-1 overflow-y-auto py-1">
          <SessionList
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
          />
        </div>

        {/* New Recording — pinned to bottom */}
        <div className="p-3 border-t border-[var(--color-border)] [-webkit-app-region:drag]">
          <button
            onClick={handleNewRecording}
            disabled={isRecording}
            className="[-webkit-app-region:no-drag] w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-default select-none"
          >
            <PlusIcon />
            New Recording
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg-base)]">
        {/* Top bar with gear icon */}
        <div className="flex justify-end px-4 pt-3 pb-2 shrink-0 [-webkit-app-region:drag]">
          <button
            onClick={() => window.electron.ipcRenderer.send('audist:prefs:open')}
            title="Preferences (⌘,)"
            className="[-webkit-app-region:no-drag] p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors cursor-default"
          >
            <GearIcon />
          </button>
        </div>

        {/* Content — swap between recording and idle */}
        <div className="flex-1 overflow-hidden">
          {isRecording ? <RecordingPage /> : <Outlet />}
        </div>
      </div>
    </div>
  )
}

export default function AppShell(): React.JSX.Element {
  return (
    <RecorderProvider>
      <AppShellInner />
    </RecorderProvider>
  )
}
