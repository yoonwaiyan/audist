// Single source of truth for keyboard shortcut hints shown in the renderer.
// A spec describes a shortcut in logical keys (Electron-accelerator style),
// `formatShortcut` renders it for the current platform. Sharing a vocabulary
// with `accelerator: 'CmdOrCtrl+,'` in src/main/menu.ts means a future
// user-customisable binding can round-trip into menu accelerators unchanged.

export type ShortcutMod = 'CmdOrCtrl' | 'CmdOrCtrl+Shift' | 'CmdOrCtrl+Alt' | 'Shift' | 'Alt'

export interface ShortcutSpec {
  mod?: ShortcutMod
  key: string
}

function isMac(): boolean {
  if (typeof window === 'undefined') return false
  return window.electron?.process?.platform === 'darwin'
}

const MAC_GLYPHS: Record<string, string> = {
  CmdOrCtrl: '⌘',
  Cmd: '⌘',
  Ctrl: '⌃',
  Shift: '⇧',
  Alt: '⌥'
}

export function formatShortcut(spec: ShortcutSpec): string {
  const parts = spec.mod ? spec.mod.split('+') : []
  if (isMac()) {
    const mods = parts.map((m) => MAC_GLYPHS[m] ?? m).join('')
    return `${mods}${spec.key}`
  }
  const mods = parts.map((m) => (m === 'CmdOrCtrl' ? 'Ctrl' : m))
  return mods.length === 0 ? spec.key : `${mods.join('+')}+${spec.key}`
}

export const SHORTCUTS = {
  openPrefs: { mod: 'CmdOrCtrl', key: ',' },
  startRecording: { mod: 'CmdOrCtrl', key: 'R' },
  stopRecording: { mod: 'CmdOrCtrl+Shift', key: 'R' }
} as const satisfies Record<string, ShortcutSpec>

export type ShortcutId = keyof typeof SHORTCUTS
