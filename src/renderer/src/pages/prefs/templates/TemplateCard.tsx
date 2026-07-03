import type { PromptTemplate } from '../../../../../preload/index.d'
import PillBadge from '../../../components/ui/PillBadge'
import TemplateOverflowMenu from './TemplateOverflowMenu'

interface TemplateCardProps {
  template: PromptTemplate
  onOpen: (id: string) => void
  onSetActive: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export default function TemplateCard({
  template,
  onOpen,
  onSetActive,
  onDuplicate,
  onDelete
}: TemplateCardProps): React.JSX.Element {
  return (
    <div
      data-testid="template-card"
      className="group flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)]
        bg-[var(--color-bg-surface)] border border-[var(--color-border)]
        hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-hover)]
        transition-colors cursor-default"
    >
      {/* The clickable "open" surface is a separate element from the overflow trigger
          below, so we never nest one interactive control inside another. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(template.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpen(template.id)
        }}
        className="flex-1 min-w-0 flex flex-col gap-0.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[var(--color-text-primary)] truncate">
            {template.name}
          </span>
          {template.isActive && <PillBadge variant="active">Active</PillBadge>}
          {template.isBuiltIn && <PillBadge variant="built-in">Built-in</PillBadge>}
        </div>
        <span className="text-[13px] text-[var(--color-text-muted)] truncate">
          {template.description}
        </span>
      </div>

      <TemplateOverflowMenu
        template={template}
        onSetActive={onSetActive}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  )
}
