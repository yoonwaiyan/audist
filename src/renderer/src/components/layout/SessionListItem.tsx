import type { SessionMeta } from '../../../../preload/index.d'

interface SessionListItemProps {
  session: SessionMeta
  active: boolean
  onClick: () => void
}

const DOT_COLOR: Record<SessionMeta['status'], string> = {
  complete: 'bg-[var(--color-success)]',
  transcribing: 'bg-[var(--color-accent-secondary)]',
  summarising: 'bg-[var(--color-accent)]',
  error: 'bg-[var(--color-error)]'
}

function parseSessionId(id: string): { name: string; time: string } {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return { name: id, time: '' }
  const [, year, month, day, hour, min] = match
  const dt = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  return {
    name: dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export default function SessionListItem({ session, active, onClick }: SessionListItemProps): React.JSX.Element {
  const isClickable = session.status === 'complete'
  const { name, time } = parseSessionId(session.id)
  const dotColor = DOT_COLOR[session.status]

  return (
    <button
      data-testid="session-item"
      onClick={onClick}
      className={[
        'w-full text-left px-5 py-2.5 transition-all relative cursor-default select-none',
        active
          ? 'bg-[var(--color-accent)]/10'
          : isClickable
          ? 'hover:bg-[var(--color-bg-surface-hover)]'
          : 'opacity-70'
      ].join(' ')}
    >
      {/* Active left bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--color-accent)] rounded-r" />
      )}

      {/* Row 1: dot + name + time */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span
          className={`text-sm font-medium truncate flex-1 ${
            active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {name}
        </span>
        {time && (
          <span className="text-[11px] text-[var(--color-text-primary)]/75 shrink-0 ml-1">
            {time}
          </span>
        )}
      </div>

      {/* Row 2: duration */}
      <div className="pl-3.5">
        <span className="font-mono text-xs text-[var(--color-text-primary)]/60">
          {formatDuration(session.duration)}
        </span>
      </div>

      {/* Row 3: progress bar while transcribing */}
      {session.status === 'transcribing' && (
        <div className="mt-1.5 pl-3.5">
          <div className="h-0.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-[var(--color-accent-secondary)] rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </button>
  )
}
