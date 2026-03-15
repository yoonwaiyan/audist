import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Settings, Plus } from 'lucide-react'
import { AppLogo } from '../ui'
import { RecorderProvider, useRecorderContext } from '../../contexts/RecorderContext'
import SessionList from './SessionList'
import RecordingPage from '../../pages/RecordingPage'
import type { SessionMeta } from '../../../../preload/index.d'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 256

function AppShellInner(): React.JSX.Element {
  const navigate = useNavigate()
  const { state: recorderState } = useRecorderContext()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onResizeMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent): void => {
      if (!isDragging.current) return
      const delta = ev.clientX - startX.current
      setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta)))
    }
    const onMouseUp = (): void => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

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
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] shrink-0 relative"
        style={{ width: sidebarWidth }}
      >
        {/* Logo — pt accounts for macOS traffic lights (hiddenInset) */}
        <div className="pt-[52px] px-5 pb-4 border-b border-[var(--color-border)] shrink-0 [-webkit-app-region:drag]">
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
        <div className="px-4 py-3 border-t border-[var(--color-border)] shrink-0 [-webkit-app-region:drag]">
          <button
            onClick={handleNewRecording}
            disabled={isRecording}
            className="[-webkit-app-region:no-drag] w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-default select-none"
          >
            <Plus className="w-4 h-4" />
            New Recording
          </button>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-20"
        >
          <div className="absolute right-0 top-0 bottom-0 w-px bg-[var(--color-border)] group-hover:bg-[var(--color-accent)]/50 group-active:bg-[var(--color-accent)] transition-colors duration-150" />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg-base)]">
        {/* Toolbar */}
        <div className="relative z-10 flex items-center justify-end gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] shrink-0 [-webkit-app-region:drag]">
          <button
            onClick={() => window.electron.ipcRenderer.send('audist:prefs:open')}
            title="Preferences (⌘,)"
            className="[-webkit-app-region:no-drag] p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Content — swap between recording and idle/session */}
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
