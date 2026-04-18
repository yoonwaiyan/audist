import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Settings, Zap } from 'lucide-react'

type NavItem = {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'General', to: '/prefs', icon: Settings },
  { label: 'LLM', to: '/prefs/llm', icon: Zap },
]

export default function PrefsLayout(): React.JSX.Element {
  const navigate = useNavigate()

  // Handle deep-link navigation from main process
  useEffect(() => {
    return window.electron.ipcRenderer.on(
      'audist:prefs:navigate',
      (_, payload: { section: string }) => {
        const sectionToRoute: Record<string, string> = {
          general: '/prefs',
          llm: '/prefs/llm',
        }
        const route = sectionToRoute[payload.section]
        if (route) navigate(route)
      }
    )
  }, [navigate])

  // Close window on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      {/* Full-width draggable titlebar — reserves space for macOS traffic lights */}
      <div className="h-8 w-full shrink-0 [-webkit-app-region:drag]" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className="w-44 shrink-0 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)]
            flex flex-col pt-1 [-webkit-app-region:drag]"
        >
          <div className="px-2 flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/prefs'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors [-webkit-app-region:no-drag]',
                    isActive
                      ? 'bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]'
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--color-accent)]' : ''}`}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
