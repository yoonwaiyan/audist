import { Plus } from 'lucide-react'
import type { OutputSection } from '../../../../../preload/index.d'
import OutputSectionRow from './OutputSectionRow'

interface OutputSectionListProps {
  sections: OutputSection[]
  disabled?: boolean
  onChange: (sections: OutputSection[]) => void
}

export default function OutputSectionList({
  sections,
  disabled = false,
  onChange
}: OutputSectionListProps): React.JSX.Element {
  const updateSection = (id: string, changes: Partial<OutputSection>): void => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }

  const deleteSection = (id: string): void => {
    onChange(sections.filter((s) => s.id !== id))
  }

  const addSection = (): void => {
    onChange([
      ...sections,
      {
        id: crypto.randomUUID(),
        heading: '',
        instruction: '',
        order: sections.length
      }
    ])
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => (
        <OutputSectionRow
          key={section.id}
          section={section}
          disabled={disabled}
          onChangeHeading={(heading) => updateSection(section.id, { heading })}
          onChangeInstruction={(instruction) => updateSection(section.id, { instruction })}
          onDelete={() => deleteSection(section.id)}
        />
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={addSection}
          className="inline-flex items-center gap-1.5 self-start px-2 py-1.5 rounded-[var(--radius-sm)]
            text-[13px] font-medium text-[var(--color-text-muted)]
            hover:text-[var(--color-text-primary)] transition-colors cursor-default"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      )}
    </div>
  )
}
