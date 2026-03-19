import { useEffect, useState, useCallback } from 'react'
import type { PermissionsState } from '../../../../../preload/index.d'
import PermissionRow from '../../../components/ui/PermissionRow'
import Button from '../../../components/ui/Button'

interface Step1PermissionsProps {
  onNext: () => void
  onBack: () => void
}

function isGranted(s: string): boolean {
  return s === 'granted'
}

function toRowStatus(s: string): 'granted' | 'denied' | 'not-yet-granted' {
  if (s === 'granted') return 'granted'
  if (s === 'denied') return 'denied'
  return 'not-yet-granted'
}

export default function Step1Permissions({ onNext, onBack }: Step1PermissionsProps): React.JSX.Element {
  const [perms, setPerms] = useState<PermissionsState | null>(null)
  const [requesting, setRequesting] = useState(false)

  const checkPermissions = useCallback(async (): Promise<PermissionsState> => {
    const state = await window.api.permissions.check()
    setPerms(state)
    return state
  }, [])

  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  useEffect(() => {
    const handleFocus = (): void => {
      checkPermissions()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [checkPermissions])

  const handleGrantMic = async (): Promise<void> => {
    setRequesting(true)
    try {
      await window.api.permissions.requestMic()
      await checkPermissions()
    } finally {
      setRequesting(false)
    }
  }

  const bothGranted = perms
    ? isGranted(perms.microphone) && isGranted(perms.screen)
    : false

  const anyDenied = perms
    ? perms.microphone === 'denied' || perms.screen === 'denied'
    : false

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Audist needs two permissions to work
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Grant microphone and screen recording access so Audist can capture your calls.
          </p>
        </div>

        {perms && (
          <div className="flex flex-col gap-3">
            <PermissionRow
              icon="microphone"
              title="Microphone"
              description="Needed to record your voice during calls"
              status={toRowStatus(perms.microphone)}
              onGrant={perms.microphone === 'not-determined' ? handleGrantMic : undefined}
            />
            <PermissionRow
              icon="screen"
              title="Screen Recording"
              description="Needed to capture system audio from your calls"
              status={toRowStatus(perms.screen)}
            />
          </div>
        )}

        {anyDenied && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Open System Settings → Privacy &amp; Security to enable denied permissions.
          </p>
        )}

        {!perms && (
          <div className="flex flex-col gap-3">
            <div className="h-16 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] animate-pulse" />
            <div className="h-16 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] animate-pulse" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} disabled={!bothGranted || requesting}>
          Continue
        </Button>
      </div>
    </div>
  )
}
