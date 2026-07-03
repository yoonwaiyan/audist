import { GripVertical, X } from 'lucide-react'
import type { OutputSection } from '../../../../../preload/index.d'
import InlineEditableText from './InlineEditableText'

interface OutputSectionRowProps {
  section: OutputSection
  disabled?: boolean
  onChangeHeading: (heading: string) => void
  onChangeInstruction: (instruction: string) => void
  onDelete: () => void
}

export default function OutputSectionRow({
  section,
  disabled = false,
  onChangeHeading,
  onChangeInstruction,
  onDelete
}: OutputSectionRowProps): React.JSX.Element {
  return (
    <div
      data-testid="output-section-row"
      className="group flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)]
        bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
    >
      <GripVertical
        className="w-4 h-4 mt-1 shrink-0 text-[var(--color-text-tertiary)] cursor-grab"
        aria-hidden
      />

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
