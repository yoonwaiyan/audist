import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Mic, Search, Settings } from 'lucide-react'
import { AppLogo } from '../ui'
import { RecorderProvider, useRecorderContext } from '../../contexts/RecorderContext'
import SessionList from './SessionList'
import RecordingPage from '../../pages/RecordingPage'
import type { SessionMeta } from '../../../../preload/index.d'
import { SHORTCUTS, formatShortcut } from '../../lib/shortcuts'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 248

function AppShellInner(): React.JSX.Element {
  const navigate = useNavigate()
  const { state: recorderState } = useRecorderContext()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const isRecording = recorderState === 'starting' || recorderState === 'recording' || recorderState === 'stopping'

  useEffect(() => {
    window.api.whisper.isReady().then((ready) => {
      if (!ready) navigate('/whisper-setup')
    })
  }, [navigate])

  useEffect(() => {
    const handleFocus = async (): Promise<void> => {
      const [perms, whisperReady] = await Promise.all([
        window.api.permissions.check(),
        window.api.whisper.isReady()
      ])
      if (perms.microphone !== 'granted' || perms.screen !== 'granted') {
        navigate('/permissions')
      } else if (!whisperReady) {
        navigate('/whisper-setup')
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
        {/* Brand row — inline with macOS traffic lights */}
        <div
          className="h-10 flex items-center shrink-0 [-webkit-app-region:drag]"
          style={{ paddingLeft: 78, paddingRight: 14 }}
        >
          <AppLogo size="sm" />
        </div>

        {/* Search */}
        <div className="px-2.5 pb-2 shrink-0">
          <div className="flex items-center gap-2 h-7 px-2 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-md">
            <Search className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recordings"
              className="flex-1 bg-transparent border-none outline-none text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>

        {/* Session list — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <SessionList
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            searchQuery={searchQuery}
          />
        </div>

        {/* New Recording — pinned to bottom */}
        <div className="px-2.5 py-2.5 border-t border-[var(--color-border)] shrink-0 [-webkit-app-region:drag]">
          <button
            onClick={handleNewRecording}
            disabled={isRecording}
            className="[-webkit-app-region:no-drag] w-full h-[34px] flex items-center justify-center gap-2 px-3 rounded-md
              bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12.5px] font-medium
              hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors cursor-default select-none"
          >
            <Mic className="w-3.5 h-3.5" />
            New recording
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
        {/* Thin drag region for main area — no toolbar buttons here */}
        <div className="h-10 shrink-0 [-webkit-app-region:drag] flex items-center justify-end px-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]">
          {/* Settings icon visible only when NOT in session detail (which has its own) */}
          {!isRecording && (
            <button
              onClick={() => window.electron.ipcRenderer.send('audist:prefs:open')}
              title={`Preferences (${formatShortcut(SHORTCUTS.openPrefs)})`}
              data-testid="prefs-button"
              className="[-webkit-app-region:no-drag] p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] transition-colors cursor-default"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
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
