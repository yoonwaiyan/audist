import StatusBadge from './StatusBadge'
import Button from './Button'

interface PermissionRowProps {
  icon: 'microphone' | 'screen'
  title: string
  description: string
  status: 'granted' | 'denied' | 'not-yet-granted'
  onGrant?: () => void
}

function MicIcon(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function ScreenIcon(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

export default function PermissionRow({ icon, title, description, status, onGrant }: PermissionRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[var(--color-text-secondary)] shrink-0">
          {icon === 'microphone' ? <MicIcon /> : <ScreenIcon />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        </div>
      </div>

      <div className="shrink-0">
        {status === 'granted' ? (
          <StatusBadge variant="granted" />
        ) : status === 'denied' ? (
          <StatusBadge variant="denied" />
        ) : onGrant ? (
          <Button variant="primary" size="sm" onClick={onGrant}>
            Grant Access →
          </Button>
        ) : (
          <StatusBadge variant="not-yet-granted" />
        )}
      </div>
    </div>
  )
}
