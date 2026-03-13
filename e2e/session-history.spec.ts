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

    await expect(page.getByText('No recordings yet. Press Start to begin.')).toBeVisible()

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
    // At least one list item rendered
    await expect(page.locator('li').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row displays formatted duration', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 90, status: 'complete' }
    ])

    // 90 seconds → "1m 30s"
    await expect(page.getByText('1m 30s')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row displays Complete status badge', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_10-00-00', duration: 60, status: 'complete' }
    ])

    await expect(page.getByText('Complete')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row with transcribing status shows Transcribing label', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      { id: '2026-03-13_11-00-00', duration: 45, status: 'transcribing' }
    ])

    await expect(page.getByText('Transcribing')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session row with error status shows Error label and Retry button', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      {
        id: '2026-03-13_12-00-00',
        duration: 30,
        status: 'error',
        error: 'Transcription process crashed'
      }
    ])

    await expect(page.getByText('Error')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry Transcription' })).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('error row shows the human-readable error message', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchWithSessions(saveDir, [
      {
        id: '2026-03-13_12-00-00',
        duration: 30,
        status: 'error',
        error: 'Transcription process crashed'
      }
    ])

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

    const rows = page.locator('li')
    await expect(rows).toHaveCount(3)

    // Newest first: 11:00 → 10:00 → 09:00; check duration order (2m 0s, 1m 30s, 1m 0s)
    await expect(rows.nth(0).getByText('2m 0s')).toBeVisible()
    await expect(rows.nth(1).getByText('1m 30s')).toBeVisible()
    await expect(rows.nth(2).getByText('1m 0s')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('session list persists across app restarts', async () => {
    const saveDir = makeSaveDir()
    seedSessions(saveDir, [{ id: '2026-03-13_10-00-00', duration: 75, status: 'complete' }])

    // First launch
    const first = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await expect(first.page.getByText('1m 15s')).toBeVisible()
    await first.app.close()
    first.cleanup()

    // Second launch — same saveDir, no re-seeding
    const second = await launchApp({ saveDirectory: saveDir, permissions: 'granted', whisper: 'ready' })
    await expect(second.page.getByText('1m 15s')).toBeVisible()
    await second.app.close()
    second.cleanup()

    fs.rmSync(saveDir, { recursive: true, force: true })
  })
})
