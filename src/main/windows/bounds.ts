import { screen } from 'electron'

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** True if the bounds overlap at least one currently connected display's work area. */
export function isOnScreen(bounds: Bounds): boolean {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x < area.x + area.width &&
      bounds.x + bounds.width > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + bounds.height > area.y
    )
  })
}
