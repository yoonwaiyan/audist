import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

type NavItem = {
  label: string
  to: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'General', to: '/prefs' },
  { label: 'AI / LLM', to: '/prefs/llm' },
  { label: 'Prompt', to: '/prefs/prompt' }
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
          prompt: '/prefs/prompt'
        }
        const route = sectionToRoute[payload.section]
        if (route) navigate(route)
      }
    )
  }, [navigate])

  return (
    <div className="flex h-full bg-[var(--color-bg-base)]">
      {/* Sidebar */}
      {/* pt-[52px] reserves space for macOS traffic lights in hiddenInset mode */}
      <nav className="w-40 shrink-0 bg-[var(--color-bg-base)] border-r border-[var(--color-border)] pt-[52px] flex flex-col gap-0.5 px-2 [-webkit-app-region:drag]">
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/prefs'}
            className={({ isActive }) =>
              [
                'block px-3 py-1.5 rounded text-sm font-medium transition-colors [-webkit-app-region:no-drag]',
                isActive
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]'
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}
