import { useEffect, useRef } from 'react'
import { KEYBINDINGS, type KeyBindingId } from '../config/keybindings'

type KeyBindingHandlers = Partial<Record<KeyBindingId, () => void>>

/**
 * Registers global keyboard shortcut handlers.
 * Handlers defined in KEYBINDINGS are matched against keydown events.
 * Ignored when focus is inside an input, textarea, or contenteditable element.
 */
export function useKeybindings(handlers: KeyBindingHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const [id, binding] of Object.entries(KEYBINDINGS) as [KeyBindingId, typeof KEYBINDINGS[KeyBindingId]][]) {
        if (
          e.key === binding.key &&
          !!e.metaKey === !!binding.meta &&
          !!e.ctrlKey === !!binding.ctrl &&
          !!e.shiftKey === !!binding.shift &&
          !!e.altKey === !!binding.alt
        ) {
          const handler = handlersRef.current[id]
          if (handler) {
            if (binding.preventDefault) e.preventDefault()
            handler()
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
