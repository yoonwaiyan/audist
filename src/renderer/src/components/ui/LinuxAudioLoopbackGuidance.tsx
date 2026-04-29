import { Info } from 'lucide-react'

/**
 * Inline guidance shown on Linux when no PulseAudio/PipeWire monitor source is
 * detected. Explains what a monitor source is and how to enable it.
 */
export default function LinuxAudioLoopbackGuidance(): React.JSX.Element {
  return (
    <div className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-warning)]/40 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Info size={16} className="text-[var(--color-warning)] shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--color-warning)]">
          System audio loopback not detected
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        To capture system audio on Linux, PulseAudio or PipeWire-pulse needs an active{' '}
        <strong className="text-[var(--color-text-primary)]">monitor source</strong> — a loopback
        device that mirrors your speakers back as an audio input.
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Enable it by running this command in a terminal:
      </p>
      <pre className="w-full rounded-md bg-[var(--color-bg-base)] border border-[var(--color-border)] px-3 py-2 text-xs font-mono text-[var(--color-text-primary)] overflow-x-auto">
        pactl load-module module-loopback
      </pre>
      <p className="text-xs text-[var(--color-text-muted)]">
        After running the command, restart Audist and check again.
      </p>
    </div>
  )
}
