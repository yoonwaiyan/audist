import { test, expect } from '@playwright/test'
import { launchAppWithSaveDir } from './helpers/electron'

test.describe('Main window', () => {
  test('renders Audist header and gear icon', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()
    await expect(page.locator('header').getByText('Audist', { exact: true })).toBeVisible()
    await expect(page.locator('button[title*="Preferences"]')).toBeVisible()
    await app.close()
    cleanup()
  })
})

test.describe('Preferences window', () => {
  test('gear icon opens preferences window with sidebar nav', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    await page.locator('button[title*="Preferences"]').click()

    const prefsPage = await app.waitForEvent('window')
    await prefsPage.waitForLoadState('domcontentloaded')

    // Use role-based selectors to avoid strict-mode ambiguity
    // (same text appears in sidebar links AND content h2)
    await expect(prefsPage.getByRole('link', { name: 'General' })).toBeVisible()
    await expect(prefsPage.getByRole('link', { name: 'AI / LLM' })).toBeVisible()
    await expect(prefsPage.getByRole('link', { name: 'Prompt' })).toBeVisible()

    await app.close()
    cleanup()
  })

  test('sidebar navigation switches sections', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    await page.locator('button[title*="Preferences"]').click()
    const prefsPage = await app.waitForEvent('window')
    await prefsPage.waitForLoadState('domcontentloaded')

    // Default section is General
    await expect(prefsPage.locator('h2').getByText('General')).toBeVisible()

    // Navigate to AI / LLM
    await prefsPage.getByRole('link', { name: 'AI / LLM' }).click()
    await expect(prefsPage.locator('h2').getByText('AI / LLM')).toBeVisible()

    // Navigate to Prompt
    await prefsPage.getByRole('link', { name: 'Prompt' }).click()
    await expect(prefsPage.locator('h2').getByText('Prompt')).toBeVisible()

    await app.close()
    cleanup()
  })

  test('clicking gear when prefs is already open does not create a second prefs window', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    // Open prefs
    await page.locator('button[title*="Preferences"]').click()
    await app.waitForEvent('window')
    const countAfterFirstOpen = app.windows().length

    // Click gear again — should focus existing window, not open a new one
    await page.locator('button[title*="Preferences"]').click()
    await page.waitForTimeout(500)

    expect(app.windows().length).toBe(countAfterFirstOpen)

    await app.close()
    cleanup()
  })
})
