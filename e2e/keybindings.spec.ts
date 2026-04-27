import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp, seedSessions } from './helpers/electron'

function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

test.describe('Session keyboard navigation', () => {
  test('ArrowDown selects the next session in the list', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [
      { id: '2026-01-01_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-01-01_10-00-00', duration: 120, status: 'complete' },
      { id: '2026-01-01_11-00-00', duration: 180, status: 'complete' }
    ])
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      // Click the first (newest) session — 11:00 → 03:00 duration
      const rows = page.locator('[data-testid="session-item"]')
      await rows.first().click()
      await expect(page.getByText('03:00')).toBeVisible({ timeout: 5000 })

      // ArrowDown should move to the second session — 10:00 → 02:00 duration
      await page.keyboard.press('ArrowDown')
      await expect(page.getByText('02:00')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('ArrowUp selects the previous session in the list', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [
      { id: '2026-01-01_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-01-01_10-00-00', duration: 120, status: 'complete' },
      { id: '2026-01-01_11-00-00', duration: 180, status: 'complete' }
    ])
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      // Click the second session (10:00 → 02:00 duration)
      const rows = page.locator('[data-testid="session-item"]')
      await rows.nth(1).click()
      await expect(page.getByText('02:00')).toBeVisible({ timeout: 5000 })

      // ArrowUp should move to the first (newest) session — 11:00 → 03:00
      await page.keyboard.press('ArrowUp')
      await expect(page.getByText('03:00')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('ArrowDown wraps from last session to first', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [
      { id: '2026-01-01_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-01-01_10-00-00', duration: 120, status: 'complete' }
    ])
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      // Click the last session (09:00 → 01:00 duration)
      const rows = page.locator('[data-testid="session-item"]')
      await rows.last().click()
      await expect(page.getByText('01:00')).toBeVisible({ timeout: 5000 })

      // ArrowDown should wrap to the first (newest) session — 10:00 → 02:00
      await page.keyboard.press('ArrowDown')
      await expect(page.getByText('02:00')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('ArrowUp wraps from first session to last', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [
      { id: '2026-01-01_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-01-01_10-00-00', duration: 120, status: 'complete' }
    ])
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      // Click the first (newest) session — 10:00 → 02:00
      const rows = page.locator('[data-testid="session-item"]')
      await rows.first().click()
      await expect(page.getByText('02:00')).toBeVisible({ timeout: 5000 })

      // ArrowUp should wrap to the last session — 09:00 → 01:00
      await page.keyboard.press('ArrowUp')
      await expect(page.getByText('01:00')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('arrow keys do not navigate when focus is inside a text input', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [
      { id: '2026-01-01_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-01-01_10-00-00', duration: 120, status: 'complete' }
    ])
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    try {
      // Select the first session
      const rows = page.locator('[data-testid="session-item"]')
      await rows.first().click()
      await expect(page.getByText('02:00')).toBeVisible({ timeout: 5000 })

      // Open preferences where there is an input, focus it, and press ArrowDown
      const [prefsPage] = await Promise.all([
        app.waitForEvent('window'),
        page.getByTestId('prefs-button').click()
      ])
      await prefsPage.waitForLoadState('domcontentloaded')
      // Focus an input in the prefs window — arrow key there should NOT change the main window session
      const input = prefsPage.locator('input').first()
      if (await input.isVisible()) {
        await input.focus()
        await prefsPage.keyboard.press('ArrowDown')
      }
      await prefsPage.close()

      // Main window session detail should still show first session
      await expect(page.getByText('02:00')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
