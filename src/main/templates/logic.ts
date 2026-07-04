import { createBuiltinTemplates, DEFAULT_BUILTIN_TEMPLATE_ID } from './builtins'
import type { OutputSection, PromptTemplate, PromptTemplatesStore } from './types'

export interface LegacyPromptSettings {
  systemPrompt?: string
  userPromptTemplate?: string
}

export class TemplateOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateOperationError'
  }
}

/**
 * Builds the initial store on first launch (or when the `promptTemplates` key is
 * missing). Seeds the 4 built-in presets and, if legacy AUD-38 prompt settings are
 * present, migrates them into a new user-created "My Custom Prompt" template that
 * becomes the default instead of the default built-in.
 */
export function buildInitialStore(
  legacy: LegacyPromptSettings | null | undefined,
  now: string,
  genId: () => string
): PromptTemplatesStore {
  const templates = createBuiltinTemplates(now)

  const hasLegacyPrompt = !!(legacy && (legacy.systemPrompt || legacy.userPromptTemplate))

  if (!hasLegacyPrompt) {
    return { templates, defaultTemplateId: DEFAULT_BUILTIN_TEMPLATE_ID }
  }

  // Unset the default built-in — the migrated template takes over as default.
  const unset = templates.map((t) => ({ ...t, isDefault: false }))

  const sections: OutputSection[] = legacy?.userPromptTemplate
    ? [
        {
          id: genId(),
          heading: 'Summary',
          instruction: legacy.userPromptTemplate,
          order: 0
        }
      ]
    : []

  const migrated: PromptTemplate = {
    id: genId(),
    name: 'My Custom Prompt',
    description: 'Migrated from your previous custom prompt settings',
    isBuiltIn: false,
    isDefault: true,
    systemPrompt: legacy?.systemPrompt ?? '',
    outputSections: sections,
    createdAt: now,
    updatedAt: now
  }

  return { templates: [...unset, migrated], defaultTemplateId: migrated.id }
}

/** Sorted: default first, then by `updatedAt` desc. */
export function listTemplates(store: PromptTemplatesStore): PromptTemplate[] {
  return [...store.templates].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function getTemplate(store: PromptTemplatesStore, id: string): PromptTemplate | null {
  return store.templates.find((t) => t.id === id) ?? null
}

export function createTemplate(
  store: PromptTemplatesStore,
  partial: Partial<PromptTemplate>,
  now: string,
  genId: () => string
): { store: PromptTemplatesStore; created: PromptTemplate } {
  const outputSections: OutputSection[] = (partial.outputSections ?? []).map((section, index) => ({
    id: section.id || genId(),
    heading: section.heading ?? '',
    instruction: section.instruction ?? '',
    order: section.order ?? index
  }))

  const created: PromptTemplate = {
    id: genId(),
    name: partial.name ?? 'Untitled Template',
    description: partial.description ?? '',
    isBuiltIn: false,
    isDefault: false,
    systemPrompt: partial.systemPrompt ?? '',
    outputSections,
    createdAt: now,
    updatedAt: now
  }

  return { store: { ...store, templates: [...store.templates, created] }, created }
}

export function updateTemplate(
  store: PromptTemplatesStore,
  id: string,
  changes: Partial<PromptTemplate>,
  now: string
): { store: PromptTemplatesStore; updated: PromptTemplate } {
  const existing = getTemplate(store, id)
  if (!existing) throw new TemplateOperationError(`Template not found: ${id}`)
  if (existing.isBuiltIn) throw new TemplateOperationError('Cannot edit a built-in template')

  const updated: PromptTemplate = {
    ...existing,
    ...changes,
    id: existing.id,
    isBuiltIn: false,
    createdAt: existing.createdAt,
    updatedAt: now
  }

  return {
    store: { ...store, templates: store.templates.map((t) => (t.id === id ? updated : t)) },
    updated
  }
}

export function deleteTemplate(
  store: PromptTemplatesStore,
  id: string
): { store: PromptTemplatesStore; success: boolean } {
  const existing = getTemplate(store, id)
  if (!existing) throw new TemplateOperationError(`Template not found: ${id}`)
  if (existing.isBuiltIn) throw new TemplateOperationError('Cannot delete a built-in template')
  if (existing.isDefault) throw new TemplateOperationError('Cannot delete the default template')

  return {
    store: { ...store, templates: store.templates.filter((t) => t.id !== id) },
    success: true
  }
}

export function duplicateTemplate(
  store: PromptTemplatesStore,
  id: string,
  name: string | undefined,
  now: string,
  genId: () => string
): { store: PromptTemplatesStore; created: PromptTemplate } {
  const existing = getTemplate(store, id)
  if (!existing) throw new TemplateOperationError(`Template not found: ${id}`)

  const created: PromptTemplate = {
    ...existing,
    id: genId(),
    name: name ?? `Copy of ${existing.name}`,
    isBuiltIn: false,
    isDefault: false,
    outputSections: existing.outputSections.map((section) => ({ ...section, id: genId() })),
    createdAt: now,
    updatedAt: now
  }

  return { store: { ...store, templates: [...store.templates, created] }, created }
}

export function setDefaultTemplate(
  store: PromptTemplatesStore,
  id: string
): { store: PromptTemplatesStore; success: boolean } {
  const existing = getTemplate(store, id)
  if (!existing) throw new TemplateOperationError(`Template not found: ${id}`)

  return {
    store: {
      templates: store.templates.map((t) => ({ ...t, isDefault: t.id === id })),
      defaultTemplateId: id
    },
    success: true
  }
}
