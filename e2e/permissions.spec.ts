import { test, expect } from '@playwright/test'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { launchApp, launchAppWithSaveDir } from './helpers/electron'

// Create a real temp dir to use as the save directory in these tests
function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

test.describe('Permissions — first launch (not-determined)', () => {
  test('redirects to permissions page when permissions not yet granted', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'not-determined'
    })

    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).toBeVisible()

    // Both permission rows visible
    await expect(page.getByText('Microphone', { exact: true })).toBeVisible()
    await expect(page.getByText('Screen Recording', { exact: true }).first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows Open System Settings button for not-determined state', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'not-determined'
    })

    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).toBeVisible()
    // Single big CTA button for opening system settings
    await expect(
      page.getByRole('button', { name: 'Open System Settings →' })
    ).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows Check again button', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'not-determined'
    })

    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })
})

test.describe('Permissions — denied state (AUD-71 blocked view)', () => {
  test('shows blocked state when both permissions denied', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'denied'
    })

    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).toBeVisible()

    // Single "Open System Settings →" CTA button
    await expect(
      page.getByRole('button', { name: 'Open System Settings →' })
    ).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('Continue button is not shown when permissions are denied', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'denied'
    })

    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue →' })).not.toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })
})

test.describe('Permissions — granted state', () => {
  test('skips permissions page and shows main UI when both granted', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    // Main window should be shown directly — no permissions gate
    await expect(page.getByRole('complementary').getByText('audist')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Audist needs your permission' })).not.toBeVisible()

    await app.close()
    cleanup()
  })
})
