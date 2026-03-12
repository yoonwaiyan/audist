import { test, expect } from '@playwright/test'
import path from 'path'
import os from 'os'
import { launchApp, launchAppWithSaveDir } from './helpers/electron'

test.describe('First launch (no save directory configured)', () => {
  test('lands on setup page with Choose Folder button', async () => {
    const { app, page, cleanup } = await launchApp()

    // Should be on /setup — setup heading and action button visible
    await expect(page.getByRole('heading', { name: 'Choose a Save Folder' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose Folder' })).toBeVisible()

    // Main recording UI must NOT be shown (gear button is only in the main window header)
    await expect(page.locator('button[title*="Preferences"]')).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('setup page has no skip or cancel option', async () => {
    const { app, page, cleanup } = await launchApp()

    await expect(page.getByRole('heading', { name: 'Choose a Save Folder' })).toBeVisible()

    // No way to dismiss the setup without choosing a folder
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
    await expect(page.locator('header').getByText('Audist', { exact: true })).toBeVisible()
    await expect(page.locator('button[title*="Preferences"]')).toBeVisible()

    // Setup page must NOT appear
    await expect(page.getByRole('heading', { name: 'Choose a Save Folder' })).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('inaccessible directory: redirects back to setup page', async () => {
    // Point to a path that does not exist — verify() will return false
    const missingDir = path.join(os.tmpdir(), 'audist-nonexistent-dir-' + Date.now())
    const { app, page, cleanup } = await launchApp({ saveDirectory: missingDir })

    // Should be redirected to setup
    await expect(page.getByRole('heading', { name: 'Choose a Save Folder' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose Folder' })).toBeVisible()

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
