import { test, expect } from '@playwright/test'
import { launchAppWithSaveDir } from './helpers/electron'

test.describe('Prompt Template editor', () => {
  test('built-in template opens read-only with Duplicate & Customise action', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    await prefsPage.getByText('Default Meeting Notes').click()
    await expect(prefsPage.getByText('Built-in template (read-only)')).toBeVisible()
    await expect(prefsPage.getByTestId('system-prompt-textarea')).toBeDisabled()
    await expect(prefsPage.getByRole('button', { name: 'Duplicate & Customise' })).toBeVisible()
    await expect(prefsPage.getByRole('button', { name: 'Save Changes' })).toHaveCount(0)

    await app.close()
    cleanup()
  })

  test('editing a custom template enables Save Changes and persists on save', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()

    // Duplicate the built-in template so we have an editable custom one.
    await prefsPage.locator('button[aria-label="Template actions"]').first().click()
    await prefsPage.getByText('Duplicate & Customise').click()

    await expect(prefsPage.getByTestId('template-name')).toBeVisible()

    const saveButton = prefsPage.getByRole('button', { name: 'Save Changes' })
    await expect(saveButton).toBeDisabled()

    const textarea = prefsPage.getByTestId('system-prompt-textarea')
    await textarea.click()
    await textarea.fill('Custom system prompt for this template.')

    await expect(saveButton).toBeEnabled()
    await saveButton.click()
    await expect(prefsPage.getByText('Saved')).toBeVisible()
    await expect(saveButton).toBeDisabled()

    // Reflected back in the textarea after reload from disk.
    await prefsPage.reload()
    await expect(prefsPage.getByTestId('system-prompt-textarea')).toHaveValue(
      'Custom system prompt for this template.'
    )

    await app.close()
    cleanup()
  })

  test('variable chip inserts token at cursor position', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await prefsPage.waitForLoadState('domcontentloaded')
    await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()
    await prefsPage.locator('button[aria-label="Template actions"]').first().click()
    await prefsPage.getByText('Duplicate & Customise').click()

    const textarea = prefsPage.getByTestId('system-prompt-textarea')
    await textarea.click()
    await textarea.fill('Hello world')
    await textarea.press('Home')

    await prefsPage.getByRole('button', { name: '{{date}}' }).click()
    await expect(textarea).toHaveValue('{{date}}Hello world')

    await app.close()
    cleanup()
  })
})
