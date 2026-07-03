import { describe, expect, it } from 'vitest'
import { createBuiltinTemplates, DEFAULT_BUILTIN_TEMPLATE_ID } from './builtins'
import {
  buildInitialStore,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  setDefaultTemplate,
  TemplateOperationError,
  updateTemplate
} from './logic'
import type { PromptTemplatesStore } from './types'

const NOW = '2026-07-03T00:00:00.000Z'
let counter = 0
function genId(): string {
  counter += 1
  return `id-${counter}`
}

function freshStore(): PromptTemplatesStore {
  return { templates: createBuiltinTemplates(NOW), defaultTemplateId: DEFAULT_BUILTIN_TEMPLATE_ID }
}

describe('createBuiltinTemplates', () => {
  it('seeds exactly 4 presets with deterministic ids', () => {
    const templates = createBuiltinTemplates(NOW)
    expect(templates).toHaveLength(4)
    expect(templates.map((t) => t.id)).toEqual([
      'builtin-default',
      'builtin-standup',
      'builtin-1on1',
      'builtin-client-discovery'
    ])
    expect(templates.every((t) => t.isBuiltIn)).toBe(true)
  })

  it('marks only the Default Meeting Notes preset as default', () => {
    const templates = createBuiltinTemplates(NOW)
    const defaults = templates.filter((t) => t.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(DEFAULT_BUILTIN_TEMPLATE_ID)
  })

  it('is idempotent across repeated calls (same ids each time)', () => {
    const a = createBuiltinTemplates(NOW)
    const b = createBuiltinTemplates(NOW)
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id))
  })
})

describe('buildInitialStore', () => {
  it('seeds built-ins with the default set when there is no legacy prompt', () => {
    const store = buildInitialStore(null, NOW, genId)
    expect(store.templates).toHaveLength(4)
    expect(store.defaultTemplateId).toBe(DEFAULT_BUILTIN_TEMPLATE_ID)
  })

  it('migrates legacy systemPrompt/userPromptTemplate into a new default user template', () => {
    const store = buildInitialStore(
      { systemPrompt: 'Legacy system prompt', userPromptTemplate: 'Legacy instructions' },
      NOW,
      genId
    )

    expect(store.templates).toHaveLength(5)
    const migrated = store.templates.find((t) => t.name === 'My Custom Prompt')
    expect(migrated).toBeDefined()
    expect(migrated?.isBuiltIn).toBe(false)
    expect(migrated?.isDefault).toBe(true)
    expect(migrated?.systemPrompt).toBe('Legacy system prompt')
    expect(migrated?.outputSections).toHaveLength(1)
    expect(migrated?.outputSections[0].instruction).toBe('Legacy instructions')
    expect(store.defaultTemplateId).toBe(migrated?.id)

    // The default built-in must be unset since the migrated template is now the default
    const defaultBuiltin = store.templates.find((t) => t.id === DEFAULT_BUILTIN_TEMPLATE_ID)
    expect(defaultBuiltin?.isDefault).toBe(false)
  })
})

describe('listTemplates', () => {
  it('sorts default first, then by updatedAt desc', () => {
    const store: PromptTemplatesStore = {
      defaultTemplateId: 'b',
      templates: [
        { ...blank('a'), updatedAt: '2026-01-03T00:00:00.000Z', isDefault: false },
        { ...blank('b'), updatedAt: '2026-01-01T00:00:00.000Z', isDefault: true },
        { ...blank('c'), updatedAt: '2026-01-02T00:00:00.000Z', isDefault: false }
      ]
    }
    const sorted = listTemplates(store)
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('CRUD operations', () => {
  it('create sets isBuiltIn false and generates id/timestamps', () => {
    const store = freshStore()
    const { created } = createTemplate(store, { name: 'New One' }, NOW, genId)
    expect(created.isBuiltIn).toBe(false)
    expect(created.isDefault).toBe(false)
    expect(created.name).toBe('New One')
    expect(created.createdAt).toBe(NOW)
    expect(created.updatedAt).toBe(NOW)
  })

  it('update rejects edits to a built-in template', () => {
    const store = freshStore()
    expect(() => updateTemplate(store, DEFAULT_BUILTIN_TEMPLATE_ID, { name: 'x' }, NOW)).toThrow(
      TemplateOperationError
    )
  })

  it('update applies changes and bumps updatedAt for a user template', () => {
    let store = freshStore()
    const { store: s1, created } = createTemplate(store, { name: 'Mine' }, NOW, genId)
    store = s1
    const LATER = '2026-07-04T00:00:00.000Z'
    const { updated } = updateTemplate(store, created.id, { name: 'Renamed' }, LATER)
    expect(updated.name).toBe('Renamed')
    expect(updated.updatedAt).toBe(LATER)
    expect(updated.createdAt).toBe(NOW)
  })

  it('delete rejects built-in templates', () => {
    const store = freshStore()
    expect(() => deleteTemplate(store, DEFAULT_BUILTIN_TEMPLATE_ID)).toThrow(TemplateOperationError)
  })

  it('delete rejects the default template', () => {
    let store = freshStore()
    const { store: s1, created } = createTemplate(store, { name: 'Mine' }, NOW, genId)
    store = s1
    const { store: s2 } = setDefaultTemplate(store, created.id)
    store = s2
    expect(() => deleteTemplate(store, created.id)).toThrow(TemplateOperationError)
  })

  it('delete succeeds for a non-default user template', () => {
    let store = freshStore()
    const { store: s1, created } = createTemplate(store, { name: 'Mine' }, NOW, genId)
    store = s1
    const { store: s2, success } = deleteTemplate(store, created.id)
    expect(success).toBe(true)
    expect(getTemplate(s2, created.id)).toBeNull()
  })

  it('duplicate deep-clones sections with new ids and defaults the name', () => {
    const store = freshStore()
    const { created } = duplicateTemplate(store, DEFAULT_BUILTIN_TEMPLATE_ID, undefined, NOW, genId)
    const original = getTemplate(store, DEFAULT_BUILTIN_TEMPLATE_ID)!
    expect(created.id).not.toBe(original.id)
    expect(created.name).toBe(`Copy of ${original.name}`)
    expect(created.isBuiltIn).toBe(false)
    expect(created.isDefault).toBe(false)
    expect(created.outputSections).toHaveLength(original.outputSections.length)
    created.outputSections.forEach((section, i) => {
      expect(section.id).not.toBe(original.outputSections[i].id)
      expect(section.heading).toBe(original.outputSections[i].heading)
    })
  })

  it('duplicate accepts a custom name', () => {
    const store = freshStore()
    const { created } = duplicateTemplate(store, DEFAULT_BUILTIN_TEMPLATE_ID, 'My Copy', NOW, genId)
    expect(created.name).toBe('My Copy')
  })

  it('setDefault marks the target as default and unsets all others, updating defaultTemplateId', () => {
    let store = freshStore()
    const { store: s1, created } = createTemplate(store, { name: 'Mine' }, NOW, genId)
    store = s1
    const { store: s2, success } = setDefaultTemplate(store, created.id)
    expect(success).toBe(true)
    expect(s2.defaultTemplateId).toBe(created.id)
    const defaultOnes = s2.templates.filter((t) => t.isDefault)
    expect(defaultOnes).toHaveLength(1)
    expect(defaultOnes[0].id).toBe(created.id)
  })

  it('operations on an unknown id throw TemplateOperationError', () => {
    const store = freshStore()
    expect(() => updateTemplate(store, 'nope', {}, NOW)).toThrow(TemplateOperationError)
    expect(() => deleteTemplate(store, 'nope')).toThrow(TemplateOperationError)
    expect(() => duplicateTemplate(store, 'nope', undefined, NOW, genId)).toThrow(
      TemplateOperationError
    )
    expect(() => setDefaultTemplate(store, 'nope')).toThrow(TemplateOperationError)
  })
})

function blank(id: string): PromptTemplatesStore['templates'][number] {
  return {
    id,
    name: id,
    description: '',
    isBuiltIn: false,
    isDefault: false,
    systemPrompt: '',
    outputSections: [],
    createdAt: NOW,
    updatedAt: NOW
  }
}
