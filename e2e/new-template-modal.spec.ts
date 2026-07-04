import { test, expect } from '@playwright/test'
import { launchAppWithSaveDir } from './helpers/electron'

test.describe('New Template modal', () => {
  test('blank template creates an empty template and opens its editor', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    await prefsPage.getByRole('button', { name: 'New Template' }).click()
    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toBeVisible()

    await prefsPage.getByText('Blank template').click()

    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toHaveCount(0)
    await expect(prefsPage.getByTestId('template-name')).toHaveText('Untitled Template')
    await expect(prefsPage.getByTestId('system-prompt-textarea')).toHaveValue('')

    await prefsPage.getByRole('button', { name: 'Back to templates' }).click()
    await expect(prefsPage.getByText('Untitled Template')).toBeVisible()

    await app.close()
    cleanup()
  })

  test('preset card duplicates the built-in and opens its editor', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    await prefsPage.getByRole('button', { name: 'New Template' }).click()
    const dialog = prefsPage.getByRole('dialog', { name: 'Create a new template' })
    await dialog.getByText('Standup Sync').click()

    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toHaveCount(0)
    await expect(prefsPage.getByTestId('template-name')).toHaveText('Copy of Standup Sync')
    await expect(prefsPage.getByText('Built-in template (read-only)')).toHaveCount(0)

    await app.close()
    cleanup()
  })

  test('closing the modal without a selection creates nothing', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    await expect(prefsPage.getByTestId('template-card').first()).toBeVisible()
    const cardCountBefore = await prefsPage.getByTestId('template-card').count()

    await prefsPage.getByRole('button', { name: 'New Template' }).click()
    await prefsPage.getByRole('button', { name: 'Close' }).click()
    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toHaveCount(0)
    expect(await prefsPage.getByTestId('template-card').count()).toBe(cardCountBefore)

    await prefsPage.getByRole('button', { name: 'New Template' }).click()
    await prefsPage.keyboard.press('Escape')
    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toHaveCount(0)
    expect(await prefsPage.getByTestId('template-card').count()).toBe(cardCountBefore)

    await prefsPage.getByRole('button', { name: 'New Template' }).click()
    await prefsPage.mouse.click(5, 5)
    await expect(prefsPage.getByRole('dialog', { name: 'Create a new template' })).toHaveCount(0)
    expect(await prefsPage.getByTestId('template-card').count()).toBe(cardCountBefore)

    await app.close()
    cleanup()
  })
})
