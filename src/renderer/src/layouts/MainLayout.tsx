import { Outlet } from 'react-router-dom'

function GearIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function MainLayout(): React.JSX.Element {
  const openPrefs = (): void => {
    window.electron.ipcRenderer.send('audist:prefs:open')
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-base)]">
      {/* [-webkit-app-region:drag] makes the header the window drag handle.
          Buttons must opt out with [-webkit-app-region:no-drag]. */}
      <header
        className="flex items-center justify-between h-12 shrink-0 [-webkit-app-region:drag]"
        style={{ paddingLeft: 'max(1rem, env(titlebar-area-x, 1rem))', paddingRight: '1rem' }}
      >
        {/* pl-[76px] reserves space for macOS traffic lights (hiddenInset = 76px wide zone) */}
        <span className="pl-[76px] text-sm font-semibold text-[var(--color-text-primary)] tracking-wide select-none">
          Audist
        </span>
        <button
          onClick={openPrefs}
          title="Preferences (⌘,)"
          className="[-webkit-app-region:no-drag] p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-default"
        >
          <GearIcon />
        </button>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
