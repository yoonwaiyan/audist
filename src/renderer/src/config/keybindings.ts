export interface KeyBinding {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  preventDefault?: boolean
}

export const KEYBINDINGS = {
  SESSION_SELECT_NEXT: {
    key: 'ArrowDown',
    description: 'Select next session',
    preventDefault: true
  },
  SESSION_SELECT_PREV: {
    key: 'ArrowUp',
    description: 'Select previous session',
    preventDefault: true
  }
} satisfies Record<string, KeyBinding>

export type KeyBindingId = keyof typeof KEYBINDINGS
