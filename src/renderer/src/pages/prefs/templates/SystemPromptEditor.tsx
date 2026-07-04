import { useEffect, useRef } from 'react'
import VariableChip from './VariableChip'

export const TEMPLATE_VARIABLES = [
  '{{transcript}}',
  '{{date}}',
  '{{duration}}',
  '{{participants}}',
  '{{meeting_title}}'
] as const

const VARIABLE_PATTERN = /\{\{(transcript|date|duration|participants|meeting_title)\}\}/g

interface SystemPromptEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Splits text into plain/variable segments so variable tokens can be given a highlight span. */
function renderHighlighted(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  VARIABLE_PATTERN.lastIndex = 0

  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(
      <span
        key={match.index}
        className="bg-[var(--color-accent-dim)] rounded-[3px] text-transparent"
      >
        {match[0]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))

  // Trailing newline needs a placeholder so the overlay's wrapped height matches the textarea.
  if (text.endsWith('\n')) nodes.push('​')

  return nodes
}

export default function SystemPromptEditor({
  value,
  onChange,
  disabled = false
}: SystemPromptEditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  // Tracks the caret position while the textarea is focused. Clicking a variable chip
  // blurs the textarea before the click handler runs, so `document.activeElement` can't
  // tell us whether there was a cursor — this ref is the source of truth instead.
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null)

  useEffect(() => {
    // Once the textarea is empty (e.g. a fresh/duplicated template), there's no prior
    // cursor to honour — reset so the next insertion appends rather than using a stale index.
    if (value === '') lastSelectionRef.current = null
  }, [value])

  const captureSelection = (): void => {
    const el = textareaRef.current
    if (!el) return
    lastSelectionRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }

  const insertVariable = (token: string): void => {
    const el = textareaRef.current
    const selection = lastSelectionRef.current
    if (!el || !selection) {
      onChange(value + token)
      return
    }
    const { start, end } = selection
    const next = value.slice(0, start) + token + value.slice(end)
    onChange(next)
    const caret = start + token.length
    lastSelectionRef.current = { start: caret, end: caret }
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  const syncScroll = (): void => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const sharedTextStyles = 'font-mono text-[13px] leading-[1.5] whitespace-pre-wrap break-words p-3'

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid rounded-[var(--radius-md)] bg-[var(--color-bg-surface)]
          border border-[var(--color-border)] focus-within:border-[var(--color-accent)]"
        style={{ gridTemplateAreas: '"stack"' }}
      >
        <div
          ref={overlayRef}
          aria-hidden
          style={{ gridArea: 'stack' }}
          className={`${sharedTextStyles} min-h-[144px] overflow-hidden pointer-events-none select-none text-transparent`}
        >
          {renderHighlighted(value)}
        </div>
        <textarea
          ref={textareaRef}
          style={{ gridArea: 'stack' }}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onSelect={captureSelection}
          onKeyUp={captureSelection}
          onClick={captureSelection}
          onFocus={captureSelection}
          rows={6}
          spellCheck={false}
          data-testid="system-prompt-textarea"
          placeholder="You are an expert meeting assistant..."
          className={`${sharedTextStyles} min-h-[144px] resize-y bg-transparent border-none
            text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
            focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          Available variables
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((token) => (
            <VariableChip key={token} token={token} onClick={insertVariable} disabled={disabled} />
          ))}
        </div>
      </div>
    </div>
  )
}
