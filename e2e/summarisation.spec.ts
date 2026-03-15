import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp, launchAppWithSaveDir, seedSessions } from './helpers/electron'

const SAMPLE_TRANSCRIPT = '[00:00:01] Hello, this is a test meeting.\n[00:00:05] We discussed the project roadmap.'
const MOCK_SUMMARY = 'Mock LLM response'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSessionDir(saveDir: string, id = '2026-01-01_10-00-00'): string {
  const sessionDir = path.join(saveDir, id)
  fs.mkdirSync(sessionDir, { recursive: true })
  fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify({ duration: 60, status: 'complete' }))
  return sessionDir
}

async function invokeSummarise(
  page: import('@playwright/test').Page,
  sessionDir: string
): Promise<void> {
  const error = await page.evaluate(async (dir) => {
    try {
      await window.electron.ipcRenderer.invoke('audist:test:summarise', dir)
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, sessionDir)
  if (error) throw new Error(error)
}

async function waitForSummaryEvent(
  page: import('@playwright/test').Page,
  channel: 'audist:summary:complete' | 'audist:summary:error'
): Promise<Record<string, unknown>> {
  return page.evaluate(
    (ch) =>
      new Promise((resolve) => {
        window.electron.ipcRenderer.once(ch, (_event, data) => resolve(data as Record<string, unknown>))
      }),
    channel
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Summarisation pipeline (AUD-36)', () => {
  test('writes summary.md with LLM response', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success'
    })
    const sessionDir = makeSessionDir(saveDir)
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), SAMPLE_TRANSCRIPT)

    try {
      const eventPromise = waitForSummaryEvent(page, 'audist:summary:complete')
      await invokeSummarise(page, sessionDir)
      await eventPromise

      expect(fs.existsSync(path.join(sessionDir, 'summary.md'))).toBe(true)
      expect(fs.readFileSync(path.join(sessionDir, 'summary.md'), 'utf-8')).toBe(MOCK_SUMMARY)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('session.json status is complete after summarisation', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success'
    })
    const sessionDir = makeSessionDir(saveDir)
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), SAMPLE_TRANSCRIPT)

    try {
      const eventPromise = waitForSummaryEvent(page, 'audist:summary:complete')
      await invokeSummarise(page, sessionDir)
      await eventPromise

      const meta = JSON.parse(fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf-8'))
      expect(meta.status).toBe('complete')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('emits audist:summary:complete with sessionId', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success'
    })
    const sessionId = '2026-01-01_10-00-00'
    const sessionDir = makeSessionDir(saveDir, sessionId)
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), SAMPLE_TRANSCRIPT)

    try {
      const eventPromise = waitForSummaryEvent(page, 'audist:summary:complete')
      await invokeSummarise(page, sessionDir)
      const event = await eventPromise

      expect(event.sessionId).toBe(sessionId)
      expect(typeof event.filePath).toBe('string')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('skips when summarisationEnabled is false', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success',
      llmSettings: { summarisationEnabled: false }
    })
    const sessionDir = makeSessionDir(saveDir)
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), SAMPLE_TRANSCRIPT)

    try {
      await invokeSummarise(page, sessionDir)
      // Give a brief moment to ensure no async write happens
      await page.waitForTimeout(200)
      expect(fs.existsSync(path.join(sessionDir, 'summary.md'))).toBe(false)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('emits NO_PROVIDER error when no LLM is configured', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    // No llm option → real OpenAIProvider with no API key → not configured
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })
    const sessionDir = makeSessionDir(saveDir)
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), SAMPLE_TRANSCRIPT)

    try {
      const eventPromise = waitForSummaryEvent(page, 'audist:summary:error')
      await invokeSummarise(page, sessionDir)
      const event = await eventPromise

      expect(event.code).toBe('NO_PROVIDER')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('emits NO_TRANSCRIPT error when transcript.txt is missing', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success'
    })
    const sessionDir = makeSessionDir(saveDir)
    // Intentionally do NOT write transcript.txt

    try {
      const eventPromise = waitForSummaryEvent(page, 'audist:summary:error')
      await invokeSummarise(page, sessionDir)
      const event = await eventPromise

      expect(event.code).toBe('NO_TRANSCRIPT')
      expect(fs.existsSync(path.join(sessionDir, 'summary.md'))).toBe(false)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// UI tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Summary display in session list (AUD-37)', () => {
  test('clicking session navigates to detail showing summary content', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    seedSessions(saveDir, [{
      id: '2026-01-01_10-00-00',
      duration: 60,
      status: 'complete',
      summaryMd: '# Meeting Summary\n\n## Key Points\n- Discussed roadmap'
    }])

    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      await page.locator('[data-testid="session-item"]').first().click()
      await expect(page.getByText('Meeting Summary')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('session without summary.md shows placeholder in detail', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    seedSessions(saveDir, [{ id: '2026-01-01_10-00-00', duration: 60, status: 'complete' }])

    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      await page.locator('[data-testid="session-item"]').first().click()
      await page.waitForTimeout(500) // allow summary load attempt
      await expect(page.getByText('No summary available.')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('session detail renders summary with headings and content', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    seedSessions(saveDir, [{
      id: '2026-01-01_10-00-00',
      duration: 60,
      status: 'complete',
      summaryMd: '# Meeting Summary\n\n## Key Points\n- Discussed roadmap\n\n## Action Items\n- [ ] Alice: Follow up'
    }])

    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      await page.locator('[data-testid="session-item"]').first().click()
      await expect(page.getByText('Meeting Summary')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Key Points')).toBeVisible()
      await expect(page.getByText('Discussed roadmap')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('session detail shows Reveal in Finder and Copy summary buttons', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    seedSessions(saveDir, [{
      id: '2026-01-01_10-00-00',
      duration: 60,
      status: 'complete',
      summaryMd: '# Meeting Summary\n\nSome content here.'
    }])

    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      await page.locator('[data-testid="session-item"]').first().click()
      await expect(page.locator('button[title="Reveal in Finder"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('button[title="Copy summary"]')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('summary written live via IPC appears in session detail', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    // Seed session with transcript but no summary yet
    seedSessions(saveDir, [{
      id: '2026-01-01_10-00-00',
      duration: 60,
      status: 'complete',
      transcriptTxt: SAMPLE_TRANSCRIPT
    }])

    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true,
      llm: 'success'
    })

    const sessionDir = path.join(saveDir, '2026-01-01_10-00-00')

    try {
      // Navigate to session detail — no summary yet
      await page.locator('[data-testid="session-item"]').first().click()
      await page.waitForTimeout(500)
      await expect(page.getByText('No summary available.')).toBeVisible()

      // Trigger summarisation
      await invokeSummarise(page, sessionDir)

      // Summary should appear in the detail view after the complete event
      await expect(page.getByText(MOCK_SUMMARY)).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
