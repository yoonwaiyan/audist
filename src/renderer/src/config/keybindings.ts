export interface KeyBinding {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  preventDefault?: boolean
}

export const KEYBINDINGS: Record<string, KeyBinding> = {
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
}

export type KeyBindingId = 'SESSION_SELECT_NEXT' | 'SESSION_SELECT_PREV'
