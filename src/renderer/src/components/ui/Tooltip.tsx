import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  /**
   * When provided, overrides hover-based visibility.
   * Pass `true` to force the tooltip open (e.g. for post-action confirmations).
   */
  open?: boolean
  children: React.ReactNode
}

/**
 * Tooltip that renders via a portal so it escapes overflow-hidden parents
 * and z-index stacking contexts.
 */
export default function Tooltip({ label, open, children }: TooltipProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const visible = open !== undefined ? open : hovered

  const updateCoords = (): void => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setCoords({ x: rect.left + rect.width / 2, y: rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => { updateCoords(); setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {visible && createPortal(
        <div
          className="pointer-events-none fixed -translate-x-1/2 -translate-y-full z-[9999]"
          style={{ left: coords.x, top: coords.y - 6 }}
        >
          <div className="whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm">
            {label}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
