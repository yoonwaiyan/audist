import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PromptTemplate } from './types'

let userDataDir: string

vi.mock('electron', () => ({
  app: {
    getPath: (): string => userDataDir
  }
}))

const NOW = '2026-07-03T00:00:00.000Z'

function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'tmpl-1',
    name: 'Test Template',
    description: '',
    isBuiltIn: false,
    isDefault: false,
    systemPrompt: 'You summarise meetings about {{meeting_title}} held on {{date}}.',
    outputSections: [
      { id: 's2', heading: 'Second', instruction: 'Second instruction', order: 1 },
      { id: 's1', heading: 'First', instruction: 'First instruction', order: 0 }
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  }
}

describe('interpolateVars', () => {
  it('replaces all 5 supported variables', async () => {
    const { interpolateVars } = await import('./engine')
    const text = '{{transcript}} | {{date}} | {{duration}} | {{participants}} | {{meeting_title}}'
    const result = interpolateVars(text, {
      transcript: 'hello',
      date: '2026-07-03',
      duration: '5m',
      participants: 'Alex, Sam',
      meeting_title: 'Sync'
    })
    expect(result).toBe('hello | 2026-07-03 | 5m | Alex, Sam | Sync')
  })

  it('replaces repeated occurrences of the same variable', async () => {
    const { interpolateVars } = await import('./engine')
    const result = interpolateVars('{{date}} and again {{date}}', {
      transcript: '',
      date: 'X',
      duration: '',
      participants: '',
      meeting_title: ''
    })
    expect(result).toBe('X and again X')
  })
})

describe('buildPromptFromTemplate', () => {
  it('builds a system + user message pair with sections in order', async () => {
    const { buildPromptFromTemplate } = await import('./engine')
    const template = makeTemplate()
    const messages = buildPromptFromTemplate(template, {
      transcript: 'the transcript',
      date: '2026-07-03',
      duration: '10m',
      participants: '',
      meeting_title: 'Standup'
    })

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toBe('You summarise meetings about Standup held on 2026-07-03.')

    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('<transcript>\nthe transcript\n</transcript>')
    expect(messages[1].content).toContain('**Date:** 2026-07-03')
    // sections ordered by `order`, not by array position
    const firstIdx = messages[1].content.indexOf('## First')
    const secondIdx = messages[1].content.indexOf('## Second')
    expect(firstIdx).toBeGreaterThan(-1)
    expect(secondIdx).toBeGreaterThan(-1)
    expect(firstIdx).toBeLessThan(secondIdx)
  })
})

describe('template resolution', () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'audist-engine-'))
  })

  afterEach(() => {
    vi.resetModules()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  it('falls back to the built-in default when no session override or default template exists', async () => {
    const { resolveTemplateForSession } = await import('./engine')
    const sessionDir = mkdtempSync(join(tmpdir(), 'audist-session-'))
    try {
      const template = resolveTemplateForSession(sessionDir)
      expect(template.id).toBe('builtin-default')
    } finally {
      rmSync(sessionDir, { recursive: true, force: true })
    }
  })

  it('uses the globally default template when no per-session override is set', async () => {
    const store = await import('./store')
    const { resolveTemplateForSession } = await import('./engine')
    const created = store.createTemplate({ name: 'Active One' })
    store.setDefaultTemplate(created.id)

    const sessionDir = mkdtempSync(join(tmpdir(), 'audist-session-'))
    try {
      const template = resolveTemplateForSession(sessionDir)
      expect(template.id).toBe(created.id)
    } finally {
      rmSync(sessionDir, { recursive: true, force: true })
    }
  })

  it('respects a per-session templateId override over the default template', async () => {
    const store = await import('./store')
    const { resolveTemplateForSession } = await import('./engine')
    const created = store.createTemplate({ name: 'Session Override' })
    // Leave builtin-default as the default globally

    const sessionDir = mkdtempSync(join(tmpdir(), 'audist-session-'))
    try {
      writeFileSync(join(sessionDir, 'session.json'), JSON.stringify({ templateId: created.id }))
      const template = resolveTemplateForSession(sessionDir)
      expect(template.id).toBe(created.id)
    } finally {
      rmSync(sessionDir, { recursive: true, force: true })
    }
  })
})

describe('buildVarsFromSession', () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'audist-engine-'))
  })

  afterEach(() => {
    vi.resetModules()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  it('reads transcript.txt, derives date from the session id, and formats duration', async () => {
    const { buildVarsFromSession } = await import('./engine')
    const root = mkdtempSync(join(tmpdir(), 'audist-sessions-'))
    const sessionDir = join(root, '2026-07-03_10-15-30')
    mkdirSync(sessionDir)
    writeFileSync(join(sessionDir, 'transcript.txt'), 'Hello world')
    writeFileSync(
      join(sessionDir, 'session.json'),
      JSON.stringify({ duration: 125, title: 'My Meeting' })
    )

    try {
      const vars = buildVarsFromSession(sessionDir)
      expect(vars.transcript).toBe('Hello world')
      expect(vars.date).toBe('2026-07-03')
      expect(vars.duration).toBe('2m 5s')
      expect(vars.meeting_title).toBe('My Meeting')
      expect(vars.participants).toBe('')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('defaults to empty transcript and empty duration/title when session.json is missing', async () => {
    const { buildVarsFromSession } = await import('./engine')
    const sessionDir = mkdtempSync(join(tmpdir(), 'audist-session-'))
    try {
      const vars = buildVarsFromSession(sessionDir)
      expect(vars.transcript).toBe('')
      expect(vars.duration).toBe('')
      expect(vars.meeting_title).toBe('')
    } finally {
      rmSync(sessionDir, { recursive: true, force: true })
    }
  })
})
