import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp } from './helpers/electron'

// Sessions whose status is left as 'transcribing' or 'summarising' when the app
// is quit mid-processing used to show a stuck "Generating summary…" spinner on
// next launch with no way to retry (all retry buttons disabled while isProcessing
// is true). resetInterruptedSessions() runs at startup and resets these to 'error'.

test.describe('Interrupted session recovery', () => {
  test('session left in summarising state is reset to error on app restart', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const sessionId = '2026-01-01_10-00-00'
    const sessionDir = path.join(saveDir, sessionId)
    fs.mkdirSync(sessionDir, { recursive: true })
    // Simulate a session interrupted mid-summarisation
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify({ duration: 60, status: 'summarising' })
    )
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), '[00:00:01] Hello world.')

    const { app, page, cleanup } = await launchApp({ saveDirectory: saveDir, permissions: 'granted' })
    try {
      // Startup cleanup should have rewritten status to 'error'
      const meta = JSON.parse(fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf-8'))
      expect(meta.status).toBe('error')
      expect(typeof meta.error).toBe('string')

      // UI: clicking the session should show a retry path, not a stuck spinner
      await page.locator('[data-testid="session-item"]').first().click()
      await expect(page.getByText('Generating summary')).not.toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('session left in transcribing state is reset to error on app restart', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const sessionId = '2026-01-01_11-00-00'
    const sessionDir = path.join(saveDir, sessionId)
    fs.mkdirSync(sessionDir, { recursive: true })
    // Simulate a session interrupted mid-transcription
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify({ duration: 120, status: 'transcribing' })
    )

    const { app, page, cleanup } = await launchApp({ saveDirectory: saveDir, permissions: 'granted' })
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf-8'))
      expect(meta.status).toBe('error')
      expect(typeof meta.error).toBe('string')

      await page.locator('[data-testid="session-item"]').first().click()
      // Should not show any in-progress indicator
      await expect(page.getByText('Transcribing')).not.toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('completed sessions and error sessions are not touched by startup cleanup', async () => {
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const sessions = [
      { id: '2026-01-01_10-00-00', status: 'complete', summary: '# Done' },
      { id: '2026-01-01_11-00-00', status: 'error', error: 'Some previous error' }
    ]
    for (const s of sessions) {
      const dir = path.join(saveDir, s.id)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        path.join(dir, 'session.json'),
        JSON.stringify({ duration: 60, status: s.status, ...(s.error ? { error: s.error } : {}) })
      )
      if (s.summary) fs.writeFileSync(path.join(dir, 'summary.md'), s.summary)
    }

    const { app, cleanup } = await launchApp({ saveDirectory: saveDir, permissions: 'granted' })
    try {
      for (const s of sessions) {
        const meta = JSON.parse(
          fs.readFileSync(path.join(saveDir, s.id, 'session.json'), 'utf-8')
        )
        expect(meta.status).toBe(s.status)
      }
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
