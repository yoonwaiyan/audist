import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical, X } from 'lucide-react'
import type { OutputSection } from '../../../../../preload/index.d'
import InlineEditableText from './InlineEditableText'

interface OutputSectionRowProps {
  section: OutputSection
  disabled?: boolean
  onChangeHeading: (heading: string) => void
  onChangeInstruction: (instruction: string) => void
  onDelete: () => void
  /** Attributes/listeners from useSortable, applied only to the drag handle icon. */
  dragHandleAttributes?: DraggableAttributes
  dragHandleListeners?: DraggableSyntheticListeners
  dragHandleRef?: (el: HTMLElement | null) => void
  /** True while this row is the one being dragged — renders an empty placeholder slot
   *  in its place (the floating preview is rendered separately via DragOverlay). */
  isDragging?: boolean
  /** Which edge of this row the drop-zone indicator line should appear on, if any. */
  dropIndicator?: 'before' | 'after' | null
}

export default function OutputSectionRow({
  section,
  disabled = false,
  onChangeHeading,
  onChangeInstruction,
  onDelete,
  dragHandleAttributes,
  dragHandleListeners,
  dragHandleRef,
  isDragging = false,
  dropIndicator = null
}: OutputSectionRowProps): React.JSX.Element {
  if (isDragging) {
    return (
      <div
        data-testid="output-section-row"
        aria-hidden
        className="h-[60px] rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)]"
      />
    )
  }

  return (
    <div
      data-testid="output-section-row"
      className="group relative flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)]
        bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
    >
      {dropIndicator === 'before' && (
        <div
          data-testid="drop-indicator"
          className="absolute -top-[5px] left-0 right-0 h-0.5 rounded-full bg-[var(--color-accent)]
            shadow-[0_0_6px_var(--color-accent)]"
        />
      )}
      {dropIndicator === 'after' && (
        <div
          data-testid="drop-indicator"
          className="absolute -bottom-[5px] left-0 right-0 h-0.5 rounded-full bg-[var(--color-accent)]
            shadow-[0_0_6px_var(--color-accent)]"
        />
      )}

      <button
        type="button"
        ref={dragHandleRef}
        aria-label="Drag to reorder section"
        disabled={disabled}
        {...dragHandleAttributes}
        {...dragHandleListeners}
        className="p-0 mt-1 shrink-0 bg-transparent border-none text-[var(--color-text-tertiary)]
          hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed
          cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" aria-hidden />
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <InlineEditableText
          value={section.heading}
          onChange={onChangeHeading}
          disabled={disabled}
          placeholder="Section heading"
          ariaLabel="Section heading"
          className="text-[14px] font-semibold w-full"
        />
        <InlineEditableText
          value={section.instruction}
          onChange={onChangeInstruction}
          disabled={disabled}
          placeholder="Instruction for this section"
          ariaLabel="Section instruction"
          className="text-[13px] text-[var(--color-text-muted)] w-full"
        />
      </div>

      {!disabled && (
        <button
          type="button"
          aria-label="Delete section"
          onClick={onDelete}
          className="p-1 rounded text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100
            hover:text-[var(--color-error)] hover:bg-[var(--color-error-dim)] transition-colors cursor-default"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
