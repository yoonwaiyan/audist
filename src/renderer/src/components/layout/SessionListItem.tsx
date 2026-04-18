import { formatDistanceToNow, isToday, isYesterday, isThisYear, format } from 'date-fns'
import { Sparkles, FileText } from 'lucide-react'
import type { SessionMeta } from '../../../../preload/index.d'

interface SessionListItemProps {
  session: SessionMeta
  active: boolean
  onClick: () => void
}

function sessionDate(id: string): Date | null {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, min, sec] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec))
}

function fallbackName(id: string): string {
  const dt = sessionDate(id)
  if (!dt) return id
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' Recording'
}

function formatRecordedTime(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
  if (isYesterday(date)) return 'Yesterday'
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'MMM d, yyyy')
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
  const isClickable = session.status === 'complete' || session.status === 'error'
  const name = session.title ?? fallbackName(session.id)
  const dt = sessionDate(session.id)
  const recordedTime = dt ? formatRecordedTime(dt) : null

  return (
    <button
      data-testid="session-item"
      onClick={onClick}
      className={[
        'w-full text-left px-2.5 py-2 rounded-md transition-all relative cursor-default select-none',
        active
          ? 'bg-[var(--color-bg-surface-hover)]'
          : isClickable
          ? 'hover:bg-[var(--color-bg-surface)]'
          : 'opacity-70'
      ].join(' ')}
    >
      {/* Active left bar */}
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[var(--color-accent)] rounded-r" />
      )}

      {/* Row 1: name (left) + recorded time (right) */}
      <div className="flex items-baseline gap-2 mb-0.5">
        <span
          className={`text-[12.5px] font-medium truncate flex-1 leading-snug ${
            active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {name}
        </span>
        {recordedTime && (
          <span className="text-[11px] text-[var(--color-text-tertiary)] shrink-0">
            {recordedTime}
          </span>
        )}
      </div>

      {/* Row 2: duration + status icons */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-[var(--color-text-muted)]">
          {formatDuration(session.duration)}
        </span>
        {session.status === 'transcribing' ? (
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex-1 h-0.5 bg-[var(--color-bg-surface-hover)] rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-[var(--color-accent-secondary)] rounded-full animate-pulse" />
            </div>
            <span className="text-[10.5px] text-[var(--color-accent-secondary)] font-medium">…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 ml-auto">
            {session.status === 'complete' && (
              <>
                <FileText className="w-2.5 h-2.5 text-[var(--color-text-tertiary)]" />
                <Sparkles className="w-2.5 h-2.5 text-[var(--color-text-tertiary)]" />
              </>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
