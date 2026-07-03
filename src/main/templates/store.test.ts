import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let userDataDir: string

vi.mock('electron', () => ({
  app: {
    getPath: (): string => userDataDir
  }
}))

describe('templates store persistence', () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'audist-templates-'))
  })

  afterEach(() => {
    vi.resetModules()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  it('seeds 4 built-ins on first read and persists templates.json', async () => {
    const store = await import('./store')
    const templates = store.listTemplates()
    expect(templates).toHaveLength(4)

    const onDisk = JSON.parse(readFileSync(join(userDataDir, 'templates.json'), 'utf-8'))
    expect(onDisk.templates).toHaveLength(4)
    expect(onDisk.activeTemplateId).toBe('builtin-default')
  })

  it('migrates legacy settings.json prompt keys and deletes them after seeding', async () => {
    writeFileSync(
      join(userDataDir, 'settings.json'),
      JSON.stringify({ llm: { systemPrompt: 'Old prompt', userPromptTemplate: 'Old template' } }),
      'utf-8'
    )

    const store = await import('./store')
    const templates = store.listTemplates()
    const migrated = templates.find((t) => t.name === 'My Custom Prompt')
    expect(migrated).toBeDefined()
    expect(migrated?.isActive).toBe(true)

    const settingsOnDisk = JSON.parse(readFileSync(join(userDataDir, 'settings.json'), 'utf-8'))
    expect(settingsOnDisk.llm.systemPrompt).toBeUndefined()
    expect(settingsOnDisk.llm.userPromptTemplate).toBeUndefined()
  })

  it('performs full CRUD lifecycle against disk', async () => {
    const store = await import('./store')

    const created = store.createTemplate({ name: 'Team Retro' })
    expect(store.getTemplate(created.id)?.name).toBe('Team Retro')

    const updated = store.updateTemplate(created.id, { name: 'Team Retro v2' })
    expect(updated.name).toBe('Team Retro v2')

    const duplicated = store.duplicateTemplate(created.id)
    expect(duplicated.name).toBe('Copy of Team Retro v2')

    const activateResult = store.setActiveTemplate(created.id)
    expect(activateResult.success).toBe(true)
    expect(store.getTemplate(created.id)?.isActive).toBe(true)

    expect(() => store.deleteTemplate(created.id)).toThrow()

    store.setActiveTemplate('builtin-default')
    const deleteResult = store.deleteTemplate(created.id)
    expect(deleteResult.success).toBe(true)
    expect(store.getTemplate(created.id)).toBeNull()
  })

  it('rejects mutating built-in templates end-to-end', async () => {
    const store = await import('./store')
    expect(() => store.updateTemplate('builtin-default', { name: 'x' })).toThrow()
    expect(() => store.deleteTemplate('builtin-standup')).toThrow()
  })
})
