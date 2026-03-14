import type { SessionMeta } from '../../../../preload/index.d'

interface SessionListItemProps {
  session: SessionMeta
  active: boolean
  onClick: () => void
}

const DOT_COLOR: Record<SessionMeta['status'], string> = {
  complete: 'bg-[var(--color-accent)]',
  transcribing: 'bg-[var(--color-text-muted)] animate-pulse',
  summarising: 'bg-[var(--color-accent)]/50 animate-pulse',
  error: 'bg-[var(--color-error)]'
}

function formatTimestamp(id: string): string {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return id
  const [, year, month, day, hour, min] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min))
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function SessionListItem({ session, active, onClick }: SessionListItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors cursor-default',
        'flex items-start gap-2.5',
        active
          ? 'bg-[var(--color-bg-surface-hover)] border-l-2 border-[var(--color-accent)] pl-[10px]'
          : 'hover:bg-[var(--color-bg-surface-hover)] border-l-2 border-transparent pl-[10px]'
      ].join(' ')}
    >
      {/* Status dot */}
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[session.status]}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
            {formatTimestamp(session.id)}
          </span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {formatDuration(session.duration)}
        </span>
      </div>
    </button>
  )
}
