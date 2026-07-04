import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import {
  buildInitialStore,
  createTemplate as createTemplateLogic,
  deleteTemplate as deleteTemplateLogic,
  duplicateTemplate as duplicateTemplateLogic,
  getTemplate as getTemplateLogic,
  listTemplates as listTemplatesLogic,
  setDefaultTemplate as setDefaultTemplateLogic,
  updateTemplate as updateTemplateLogic,
  type LegacyPromptSettings
} from './logic'
import type { PromptTemplate, PromptTemplatesStore } from './types'

function templatesPath(): string {
  return join(app.getPath('userData'), 'templates.json')
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function genId(): string {
  return randomUUID()
}

/** Reads a raw on-disk template, tolerating the pre-rename `isActive` field name. */
function migrateLegacyActiveField(raw: Record<string, unknown>): PromptTemplatesStore {
  const templates = ((raw.templates as Record<string, unknown>[]) ?? []).map((t) => ({
    ...t,
    isDefault: (t.isDefault as boolean | undefined) ?? (t.isActive as boolean | undefined) ?? false
  })) as PromptTemplate[]
  const defaultTemplateId =
    (raw.defaultTemplateId as string | undefined) ?? (raw.activeTemplateId as string | undefined)
  return { templates, defaultTemplateId: defaultTemplateId ?? templates[0]?.id ?? '' }
}

function readRawStore(): PromptTemplatesStore | null {
  const p = templatesPath()
  if (!existsSync(p)) return null
  try {
    return migrateLegacyActiveField(JSON.parse(readFileSync(p, 'utf-8')))
  } catch {
    return null
  }
}

function writeRawStore(store: PromptTemplatesStore): void {
  writeFileSync(templatesPath(), JSON.stringify(store, null, 2), 'utf-8')
}

/** Reads legacy AUD-38 prompt settings from settings.json without requiring them on the typed schema. */
function readLegacyPromptSettings(): LegacyPromptSettings | null {
  const p = settingsPath()
  if (!existsSync(p)) return null
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>
    const llm = raw.llm as Record<string, unknown> | undefined
    if (!llm) return null
    const systemPrompt = typeof llm.systemPrompt === 'string' ? llm.systemPrompt : undefined
    const userPromptTemplate =
      typeof llm.userPromptTemplate === 'string' ? llm.userPromptTemplate : undefined
    if (!systemPrompt && !userPromptTemplate) return null
    return { systemPrompt, userPromptTemplate }
  } catch {
    return null
  }
}

/** Removes the legacy prompt keys from settings.json after a successful migration. */
function clearLegacyPromptSettings(): void {
  const p = settingsPath()
  if (!existsSync(p)) return
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>
    const llm = raw.llm as Record<string, unknown> | undefined
    if (!llm) return
    delete llm.systemPrompt
    delete llm.userPromptTemplate
    writeFileSync(p, JSON.stringify({ ...raw, llm }, null, 2), 'utf-8')
  } catch {
    // Non-critical — legacy keys will simply be ignored on next read
  }
}

/** Ensures the templates store exists, seeding built-ins (and migrating legacy prompt settings) on first run. */
function ensureSeeded(): PromptTemplatesStore {
  const existing = readRawStore()
  if (existing) return existing

  const legacy = readLegacyPromptSettings()
  const store = buildInitialStore(legacy, new Date().toISOString(), genId)
  writeRawStore(store)
  if (legacy) clearLegacyPromptSettings()
  return store
}

export function listTemplates(): PromptTemplate[] {
  return listTemplatesLogic(ensureSeeded())
}

export function getTemplate(id: string): PromptTemplate | null {
  return getTemplateLogic(ensureSeeded(), id)
}

export function getDefaultTemplateId(): string {
  return ensureSeeded().defaultTemplateId
}

export function createTemplate(partial: Partial<PromptTemplate>): PromptTemplate {
  const { store, created } = createTemplateLogic(
    ensureSeeded(),
    partial,
    new Date().toISOString(),
    genId
  )
  writeRawStore(store)
  return created
}

export function updateTemplate(id: string, changes: Partial<PromptTemplate>): PromptTemplate {
  const { store, updated } = updateTemplateLogic(
    ensureSeeded(),
    id,
    changes,
    new Date().toISOString()
  )
  writeRawStore(store)
  return updated
}

export function deleteTemplate(id: string): { success: boolean } {
  const { store, success } = deleteTemplateLogic(ensureSeeded(), id)
  writeRawStore(store)
  return { success }
}

export function duplicateTemplate(id: string, name?: string): PromptTemplate {
  const { store, created } = duplicateTemplateLogic(
    ensureSeeded(),
    id,
    name,
    new Date().toISOString(),
    genId
  )
  writeRawStore(store)
  return created
}

export function setDefaultTemplate(id: string): { success: boolean } {
  const { store, success } = setDefaultTemplateLogic(ensureSeeded(), id)
  writeRawStore(store)
  return { success }
}
