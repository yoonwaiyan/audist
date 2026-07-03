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

    // Default Meeting Notes is the seeded active built-in template.
    const activeCard = prefsPage.getByText('Default Meeting Notes').locator('..').locator('..')
    await expect(activeCard.getByText('Active')).toBeVisible()
    await expect(activeCard.getByText('Built-in')).toBeVisible()

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
    await expect(prefsPage.getByText('Set as Active')).toBeVisible()
    await expect(prefsPage.getByText('Duplicate & Customise')).toBeVisible()
    await expect(prefsPage.getByText('Delete', { exact: true })).not.toBeVisible()

    await app.close()
    cleanup()
  })
})
