import { useState, useRef, useEffect } from 'react'
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

const MARGIN = 8 // px gap from viewport edge

/**
 * Tooltip that renders via a portal so it escapes overflow-hidden parents
 * and z-index stacking contexts.
 */
export default function Tooltip({ label, open, children }: TooltipProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const anchorRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const visible = open !== undefined ? open : hovered

  const computeCoords = (): void => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    setCoords({ x: centerX, y: rect.top })
  }

  // After the tooltip is rendered into the portal, clamp its x so it stays on-screen
  useEffect(() => {
    if (!visible || !tooltipRef.current) return
    const tw = tooltipRef.current.offsetWidth
    const maxX = window.innerWidth - MARGIN - tw / 2
    const minX = MARGIN + tw / 2
    setCoords(prev => ({ ...prev, x: Math.min(maxX, Math.max(minX, prev.x)) }))
  }, [visible])

  return (
    <div
      ref={anchorRef}
      onMouseEnter={() => { computeCoords(); setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {visible && createPortal(
        <div
          ref={tooltipRef}
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
