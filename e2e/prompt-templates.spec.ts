import { test, expect } from '@playwright/test'
import { launchAppWithSaveDir } from './helpers/electron'

test.describe('Prompt Templates list view', () => {
  test('navigating to Prompt Templates shows built-in templates with badges', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')

    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()
    await expect(prefsPage.getByRole('heading', { name: 'Prompt Templates' })).toBeVisible()

    // Default Meeting Notes is the seeded default built-in template.
    const defaultCard = prefsPage.getByText('Default Meeting Notes').locator('..').locator('..')
    // exact: true — the template's own name also contains the substring "Default"
    await expect(defaultCard.getByText('Default', { exact: true })).toBeVisible()
    await expect(defaultCard.getByText('Built-in')).toBeVisible()

    // Empty-state CTA shown since no custom templates exist yet.
    await expect(
      prefsPage.getByText('Create your first custom template to tailor summaries to your workflow.')
    ).toBeVisible()

    await app.close()
    cleanup()
  })

  test('overflow menu differs for built-in templates (no delete option)', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    await prefsPage.locator('button[aria-label="Template actions"]').first().click()
    await expect(prefsPage.getByText('Set as Default')).toBeVisible()
    await expect(prefsPage.getByText('Duplicate & Customise')).toBeVisible()
    await expect(prefsPage.getByText('Delete', { exact: true })).not.toBeVisible()

    await app.close()
    cleanup()
  })
})
