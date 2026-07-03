import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { GripVertical, Plus } from 'lucide-react'
import type { OutputSection } from '../../../../../preload/index.d'
import OutputSectionRow from './OutputSectionRow'

interface OutputSectionListProps {
  sections: OutputSection[]
  disabled?: boolean
  onChange: (sections: OutputSection[]) => void
}

type DropTarget = { overId: string; position: 'before' | 'after' } | null

/** Wraps a row with dnd-kit's useSortable so the handle icon can drive the drag. */
function SortableSectionRow({
  section,
  disabled,
  dropIndicator,
  onChangeHeading,
  onChangeInstruction,
  onDelete
}: {
  section: OutputSection
  disabled: boolean
  dropIndicator: 'before' | 'after' | null
  onChangeHeading: (heading: string) => void
  onChangeInstruction: (instruction: string) => void
  onDelete: () => void
}): React.JSX.Element {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id, disabled })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition
      }}
    >
      <OutputSectionRow
        section={section}
        disabled={disabled}
        onChangeHeading={onChangeHeading}
        onChangeInstruction={onChangeInstruction}
        onDelete={onDelete}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        dragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
        dropIndicator={dropIndicator}
      />
    </div>
  )
}

export default function OutputSectionList({
  sections,
  disabled = false,
  onChange
}: OutputSectionListProps): React.JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)

  // A short activation distance keeps click-to-edit on the heading/instruction text working
  // (the handle itself is a separate element, but this also guards against accidental drags).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent): void => {
    const { active, over } = event
    if (!over || over.id === active.id) {
      setDropTarget(null)
      return
    }
    const activeRect = active.rect.current.translated
    const overRect = over.rect
    const position: 'before' | 'after' =
      activeRect && activeRect.top < overRect.top + overRect.height / 2 ? 'before' : 'after'
    setDropTarget({ overId: String(over.id), position })
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    setActiveId(null)
    const target = dropTarget
    setDropTarget(null)
    if (!over || active.id === over.id || !target) return

    const draggedIndex = sections.findIndex((s) => s.id === active.id)
    if (draggedIndex === -1) return
    const dragged = sections[draggedIndex]
    const rest = sections.filter((s) => s.id !== active.id)
    const overIndexInRest = rest.findIndex((s) => s.id === target.overId)
    if (overIndexInRest === -1) return
    const insertAt = target.position === 'before' ? overIndexInRest : overIndexInRest + 1

    const reordered = [...rest.slice(0, insertAt), dragged, ...rest.slice(insertAt)]
    onChange(reordered.map((s, index) => ({ ...s, order: index })))
  }

  const handleDragCancel = (): void => {
    setActiveId(null)
    setDropTarget(null)
  }

  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sections.map((s) => s.id)}>
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <SortableSectionRow
              key={section.id}
              section={section}
              disabled={disabled}
              dropIndicator={dropTarget?.overId === section.id ? dropTarget.position : null}
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
      </SortableContext>

      <DragOverlay>
        {activeSection && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)]
              bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)]
              shadow-[var(--shadow-3)] rotate-1 scale-[1.02] cursor-grabbing"
          >
            <GripVertical
              className="w-4 h-4 mt-1 shrink-0 text-[var(--color-accent)]"
              aria-hidden
            />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                {activeSection.heading || 'Section heading'}
              </span>
              <span className="text-[13px] text-[var(--color-text-muted)] truncate">
                {activeSection.instruction || 'Instruction for this section'}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
