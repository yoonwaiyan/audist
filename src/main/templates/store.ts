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
  setActiveTemplate as setActiveTemplateLogic,
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

function readRawStore(): PromptTemplatesStore | null {
  const p = templatesPath()
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as PromptTemplatesStore
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

export function getActiveTemplateId(): string {
  return ensureSeeded().activeTemplateId
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

export function setActiveTemplate(id: string): { success: boolean } {
  const { store, success } = setActiveTemplateLogic(ensureSeeded(), id)
  writeRawStore(store)
  return { success }
}
