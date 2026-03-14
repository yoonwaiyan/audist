import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PermissionStatus, PermissionsState } from '../../../preload/index.d'

// ────────────────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────────────────

function MicIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function ScreenIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────────────

function isGranted(s: PermissionStatus): boolean {
  return s === 'granted'
}

// ────────────────────────────────────────────────────────────────────────────
// Permission row sub-component
// ────────────────────────────────────────────────────────────────────────────

interface MicRowProps {
  status: PermissionStatus
  onRequest: () => void
  requesting: boolean
}

function MicRow({ status, onRequest, requesting }: MicRowProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-text-secondary)]">
            <MicIcon />
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Microphone</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Needed to record your voice during calls
            </p>
          </div>
        </div>

        {isGranted(status) ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] shrink-0">
            <CheckIcon />
            Granted
          </span>
        ) : status === 'denied' ? (
          <button
            onClick={() => window.api.permissions.openSettings('microphone')}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface-hover)]
              text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors cursor-default"
          >
            Open System Settings
          </button>
        ) : (
          <button
            onClick={onRequest}
            disabled={requesting}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent)]
              text-white hover:bg-[var(--color-accent-hover)] transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
          >
            {requesting ? 'Requesting…' : 'Grant Access'}
          </button>
        )}
      </div>

      {status === 'denied' && (
        <p className="text-xs text-[var(--color-warning)]">
          Microphone access was denied. Enable it in System Settings → Privacy &amp; Security →
          Microphone.
        </p>
      )}
    </div>
  )
}

interface ScreenRowProps {
  status: PermissionStatus
}

function ScreenRow({ status }: ScreenRowProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-text-secondary)]">
            <ScreenIcon />
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Screen Recording</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Needed to capture system audio from your calls
            </p>
          </div>
        </div>

        {isGranted(status) ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] shrink-0">
            <CheckIcon />
            Granted
          </span>
        ) : (
          <button
            onClick={() => window.api.permissions.openSettings('screen')}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface-hover)]
              text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors cursor-default"
          >
            Open System Settings
          </button>
        )}
      </div>

      {!isGranted(status) && (
        <ol className="text-xs text-[var(--color-text-secondary)] space-y-1 pl-4 list-decimal">
          <li>
            Click <strong className="text-[var(--color-text-primary)]">Open System Settings</strong>
          </li>
          <li>
            Go to <strong className="text-[var(--color-text-primary)]">Privacy &amp; Security</strong>{' '}
            → <strong className="text-[var(--color-text-primary)]">Screen Recording</strong>
          </li>
          <li>
            Enable the toggle next to{' '}
            <strong className="text-[var(--color-text-primary)]">Audist</strong>
          </li>
          <li>Relaunch Audist if prompted</li>
        </ol>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function PermissionsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [perms, setPerms] = useState<PermissionsState | null>(null)
  const [requesting, setRequesting] = useState(false)

  const checkPermissions = useCallback(async (): Promise<PermissionsState> => {
    const state = await window.api.permissions.check()
    setPerms(state)
    return state
  }, [])

  // Navigate to / as soon as both permissions are confirmed
  const navigateIfGranted = useCallback(
    (state: PermissionsState) => {
      if (isGranted(state.microphone) && isGranted(state.screen)) {
        navigate('/')
      }
    },
    [navigate]
  )

  // Initial check on mount
  useEffect(() => {
    checkPermissions().then(navigateIfGranted)
  }, [checkPermissions, navigateIfGranted])

  // Re-check on window focus (user may have changed settings mid-session)
  useEffect(() => {
    const handleFocus = (): void => {
      checkPermissions().then(navigateIfGranted)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [checkPermissions, navigateIfGranted])

  const handleRequestMic = async (): Promise<void> => {
    setRequesting(true)
    try {
      await window.api.permissions.requestMic()
      const state = await checkPermissions()
      navigateIfGranted(state)
    } finally {
      setRequesting(false)
    }
  }

  const handleRecheck = async (): Promise<void> => {
    const state = await checkPermissions()
    navigateIfGranted(state)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg-base)] px-8">
      {/* Drag region for macOS title bar */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      <div className="flex flex-col gap-6 max-w-sm w-full">
        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Permissions Required
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Audist needs access to your microphone and screen recording to capture your calls.
          </p>
        </div>

        {/* Permission rows */}
        {perms && (
          <div className="flex flex-col gap-3">
            <MicRow
              status={perms.microphone}
              onRequest={handleRequestMic}
              requesting={requesting}
            />
            <ScreenRow status={perms.screen} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleRecheck}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              transition-colors cursor-default"
          >
            Re-check Permissions
          </button>

          {perms && isGranted(perms.microphone) && isGranted(perms.screen) && (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
                hover:bg-[var(--color-accent-hover)] transition-colors cursor-default"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
