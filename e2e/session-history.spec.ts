import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp, seedSessions } from './helpers/electron'

function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

async function launchWithSessions(
  saveDir: string,
  sessions: Parameters<typeof seedSessions>[1]
) {
  seedSessions(saveDir, sessions)
  return launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
}

test.describe('Session history list', () => {
  test('shows empty state when no sessions exist', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    await expect(page.getByText('No recordings yet')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows session row for a completed session', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 90, status: 'complete' }
    ])

    await expect(page.getByText('No recordings yet')).not.toBeVisible()
    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row displays formatted duration', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 90, status: 'complete' }
    ])

    // 90 seconds → "01:30"
    await expect(page.getByText('01:30')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('complete session row is visible and clickable', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 60, status: 'complete' }
    ])

    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row with transcribing status shows progress indicator', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_11-00-00', duration: 45, status: 'transcribing' }
    ])

    await expect(page.locator('[data-testid="session-item"] .animate-pulse').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('error session row is visible in the sidebar', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      {
        id: '2026-03-13_12-00-00',
        duration: 30,
        status: 'error',
        error: 'Transcription process crashed'
      }
    ])

    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('error session detail shows the human-readable error message', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      {
        id: '2026-03-13_12-00-00',
        duration: 30,
        status: 'error',
        error: 'Transcription process crashed'
      }
    ])

    await page.locator('[data-testid="session-item"]').first().click()
    await expect(page.getByText('Transcription process crashed')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('multiple sessions appear in newest-first order', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_09-00-00', duration: 60, status: 'complete' },
      { id: '2026-03-13_11-00-00', duration: 120, status: 'complete' },
      { id: '2026-03-13_10-00-00', duration: 90, status: 'complete' }
    ])

    const rows = page.locator('[data-testid="session-item"]')
    await expect(rows).toHaveCount(3)

    // Newest first: 11:00 → 10:00 → 09:00; check duration order (02:00, 01:30, 01:00)
    await expect(rows.nth(0).getByText('02:00')).toBeVisible()
    await expect(rows.nth(1).getByText('01:30')).toBeVisible()
    await expect(rows.nth(2).getByText('01:00')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session detail shows Recorded and Duration labels in metadata row', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 90, status: 'complete' }
    ])

    await page.locator('[data-testid="session-item"]').first().click()
    await expect(page.getByText('Recorded')).toBeVisible()
    await expect(page.getByText('Duration')).toBeVisible()
    await expect(page.getByText('01:30')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session without title shows timestamp-derived label in sidebar', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 60, status: 'complete' }
    ])

    // No title seeded — should show the date-derived name "Mar 13"
    await expect(page.locator('[data-testid="session-item"]').first()).toContainText('Mar 13')

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session with title shows custom title in sidebar', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 60, status: 'complete', title: 'Design Review' }
    ])

    await expect(page.locator('[data-testid="session-item"]').first()).toContainText('Design Review')

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('renaming a session in detail view updates the sidebar title', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 60, status: 'complete' }
    ])

    // Open session detail
    await page.locator('[data-testid="session-item"]').first().click()

    // Click the title to enter edit mode
    await page.locator('[data-testid="session-title"]').click()
    const input = page.getByRole('textbox', { name: 'Session title' })
    await expect(input).toBeVisible()
    await input.fill('Q1 Planning')
    await input.press('Enter')

    // Sidebar should now reflect the new title
    await expect(page.locator('[data-testid="session-item"]').first()).toContainText('Q1 Planning')

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('renamed title persists after restart', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [{ id: '2026-03-13_10-00-00', duration: 60, status: 'complete' }])

    const first = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await first.page.locator('[data-testid="session-item"]').first().click()
    await first.page.locator('[data-testid="session-title"]').click()
    const input = first.page.getByRole('textbox', { name: 'Session title' })
    await input.fill('Sprint Retro')
    await input.press('Enter')
    await first.app.close()
    first.cleanup()

    const second = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await expect(second.page.locator('[data-testid="session-item"]').first()).toContainText('Sprint Retro')
    await second.app.close()
    second.cleanup()

    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session list persists across app restarts', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [{ id: '2026-03-13_10-00-00', duration: 75, status: 'complete' }])

    // First launch
    const first = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await expect(first.page.getByText('01:15')).toBeVisible()
    await first.app.close()
    first.cleanup()

    // Second launch — same saveDir, no re-seeding
    const second = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await expect(second.page.getByText('01:15')).toBeVisible()
    await second.app.close()
    second.cleanup()

    fs.rmSync(saveDir, { recursive: true, force: true })
  })
})
