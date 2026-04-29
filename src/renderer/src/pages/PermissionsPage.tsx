import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { PermissionsState } from '../../../preload/index.d'
import SetupShell from '../components/layout/SetupShell'
import AppLogo from '../components/ui/AppLogo'
import PermissionRow from '../components/ui/PermissionRow'
import Button from '../components/ui/Button'

const isLinux = window.electron.process.platform === 'linux'

function isGranted(s: string): boolean {
  return s === 'granted'
}

function toRowStatus(s: string): 'granted' | 'denied' | 'not-yet-granted' {
  if (s === 'granted') return 'granted'
  if (s === 'denied') return 'denied'
  return 'not-yet-granted'
}

// On Linux the main process always returns 'granted' for mic (no systemPreferences API).
// Probe the real state from the renderer via getUserMedia.
async function probeLinuxMic(): Promise<'granted' | 'denied'> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return 'granted'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      return 'denied'
    }
    // Other errors (NotFoundError, etc.) — treat as granted so we don't block setup
    return 'granted'
  }
}

export default function PermissionsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [perms, setPerms] = useState<PermissionsState | null>(null)
  const [openSettingsSupported, setOpenSettingsSupported] = useState(true)

  const checkPermissions = useCallback(async (): Promise<PermissionsState> => {
    const state = await window.api.permissions.check()
    if (isLinux) {
      const micStatus = await probeLinuxMic()
      const resolved = { ...state, microphone: micStatus }
      setPerms(resolved)
      return resolved
    }
    setPerms(state)
    return state
  }, [])

  const navigateIfGranted = useCallback(
    (state: PermissionsState) => {
      if (isGranted(state.microphone) && isGranted(state.screen)) {
        navigate('/')
      }
    },
    [navigate]
  )

  useEffect(() => {
    checkPermissions().then(navigateIfGranted)
  }, [checkPermissions, navigateIfGranted])

  useEffect(() => {
    const handleFocus = (): void => {
      checkPermissions().then(navigateIfGranted)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [checkPermissions, navigateIfGranted])

  const handleRecheck = async (): Promise<void> => {
    const state = await checkPermissions()
    navigateIfGranted(state)
  }

  const handleOpenSettings = async (): Promise<void> => {
    if (!perms) return
    const target = !isGranted(perms.microphone) ? 'microphone' : 'screen'
    const result = await window.api.permissions.openSettings(target)
    if (!result.supported) {
      setOpenSettingsSupported(false)
    }
  }

  return (
    <SetupShell>
      <div className="flex flex-col items-center gap-8 w-full max-w-sm py-8">
        {/* Logo */}
        <AppLogo size="lg" showWordmark />

        {/* Warning icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30">
          <AlertTriangle
            size={32}
            className="text-[var(--color-warning)]"
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Audist needs your permission
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Grant the required permissions below to start recording
          </p>
        </div>

        {/* Permission rows card */}
        {perms && (
          <div className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col gap-3">
            <PermissionRow
              icon="microphone"
              title="Microphone"
              description="Needed to record your voice during calls"
              status={toRowStatus(perms.microphone)}
            />
            <PermissionRow
              icon="screen"
              title="Screen Recording"
              description="Needed to capture system audio from your calls"
              status={toRowStatus(perms.screen)}
            />
          </div>
        )}

        {/* Primary CTA */}
        <div className="w-full flex flex-col items-center gap-3">
          {openSettingsSupported ? (
            <Button variant="primary" className="w-full" onClick={handleOpenSettings}>
              Open System Settings →
            </Button>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              Check your PulseAudio/PipeWire microphone settings
            </p>
          )}

          <Button variant="text" onClick={handleRecheck}>
            Check again
          </Button>
        </div>

        {/* Privacy note */}
        <div className="w-full p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Audist never uploads audio or recordings. Everything stays on your Mac.
          </p>
        </div>
      </div>
    </SetupShell>
  )
}
