import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp, launchAppWithSaveDir } from './helpers/electron'
import type { Page } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

async function openGeneralPrefsPage(
  app: ElectronApplication,
  mainPage: Page
): Promise<Page> {
  const [prefsPage] = await Promise.all([
    app.waitForEvent('window'),
    mainPage.getByTitle('Preferences (⌘,)').click()
  ])
  await prefsPage.waitForLoadState('domcontentloaded')
  return prefsPage
}

test.describe('First launch (no save directory configured)', () => {
  test('lands on onboarding wizard at permissions step', async () => {
    const { app, page, cleanup } = await launchApp()

    // Should be on /onboarding — step 1 (permissions) heading visible
    await expect(
      page.getByRole('heading', { name: 'Audist needs two permissions to work' })
    ).toBeVisible()

    // Main recording UI must NOT be shown (gear button is only in the main window header)
    await expect(page.locator('button[title*="Preferences"]')).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('onboarding wizard has no skip or cancel option on step 1', async () => {
    const { app, page, cleanup } = await launchApp()

    await expect(
      page.getByRole('heading', { name: 'Audist needs two permissions to work' })
    ).toBeVisible()

    // No way to skip past step 1 (Back is disabled, no skip/cancel)
    await expect(page.getByRole('button', { name: /skip/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /skip/i })).not.toBeVisible()

    await app.close()
    cleanup()
  })
})

test.describe('Subsequent launch (save directory configured)', () => {
  test('valid directory: skips setup and shows main recording UI', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    // Should land on main window — Audist header is visible
    await expect(page.getByRole('complementary').getByText('audist')).toBeVisible()
    await expect(page.locator('button[title*="Preferences"]')).toBeVisible()

    // Onboarding must NOT appear
    await expect(
      page.getByRole('heading', { name: 'Audist needs two permissions to work' })
    ).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('inaccessible directory: redirects to onboarding wizard', async () => {
    // Point to a path that does not exist — verify() will return false
    const missingDir = path.join(os.tmpdir(), 'audist-nonexistent-dir-' + Date.now())
    const { app, page, cleanup } = await launchApp({ saveDirectory: missingDir })

    // Should be redirected to onboarding step 1
    await expect(
      page.getByRole('heading', { name: 'Audist needs two permissions to work' })
    ).toBeVisible()

    await app.close()
    cleanup()
  })

  test('General preferences shows the configured save folder path', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    // Open prefs
    await page.locator('button[title*="Preferences"]').click()
    const prefsPage = await app.waitForEvent('window')
    await prefsPage.waitForLoadState('domcontentloaded')

    // General is the default section — save folder path should be visible
    await expect(prefsPage.getByRole('heading', { name: 'General' })).toBeVisible()
    await expect(prefsPage.getByText(os.tmpdir(), { exact: false })).toBeVisible()
    await expect(prefsPage.getByRole('button', { name: 'Change…' })).toBeVisible()

    await app.close()
    cleanup()
  })
})

test.describe('Change save directory — validation (AUD-40)', () => {
  test('valid selection updates the displayed path', async () => {
    const newDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-newdir-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-')),
      permissions: 'granted',
      whisper: 'ready',
      selectDir: newDir
    })
    try {
      const prefsPage = await openGeneralPrefsPage(app, page)

      await prefsPage.getByRole('button', { name: 'Change…' }).click()

      await expect(prefsPage.getByText(newDir)).toBeVisible({ timeout: 3000 })
      await expect(
        prefsPage.getByText(/not writable|does not exist|application bundle/i)
      ).not.toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(newDir, { recursive: true, force: true })
    }
  })

  test('non-existent path shows inline error and preserves old path', async () => {
    const originalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const missingDir = path.join(os.tmpdir(), 'audist-no-such-dir-' + Date.now())
    const { app, page, cleanup } = await launchApp({
      saveDirectory: originalDir,
      permissions: 'granted',
      whisper: 'ready',
      selectDir: missingDir
    })
    try {
      const prefsPage = await openGeneralPrefsPage(app, page)

      await prefsPage.getByRole('button', { name: 'Change…' }).click()

      await expect(prefsPage.getByText('Selected folder does not exist.')).toBeVisible({
        timeout: 3000
      })
      await expect(prefsPage.getByText(originalDir)).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(originalDir, { recursive: true, force: true })
    }
  })

  test('non-writable path shows inline error and preserves old path', async () => {
    // fs.chmodSync is a no-op for directories on Windows (ACL-based permissions,
    // not Unix bits), so accessSync(W_OK) always returns true there. Skip rather
    // than producing a false-positive pass or a confusing failure.
    test.skip(process.platform === 'win32', 'chmod does not restrict directory access on Windows')

    const originalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const readOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-readonly-'))
    fs.chmodSync(readOnlyDir, 0o444)
    const { app, page, cleanup } = await launchApp({
      saveDirectory: originalDir,
      permissions: 'granted',
      whisper: 'ready',
      selectDir: readOnlyDir
    })
    try {
      const prefsPage = await openGeneralPrefsPage(app, page)

      await prefsPage.getByRole('button', { name: 'Change…' }).click()

      await expect(prefsPage.getByText('Selected folder is not writable.')).toBeVisible({
        timeout: 3000
      })
      await expect(prefsPage.getByText(originalDir)).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.chmodSync(readOnlyDir, 0o755)
      fs.rmSync(originalDir, { recursive: true, force: true })
      fs.rmSync(readOnlyDir, { recursive: true, force: true })
    }
  })
})
