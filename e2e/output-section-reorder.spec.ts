import { test, expect, type Page } from '@playwright/test'
import { launchAppWithSaveDir } from './helpers/electron'

async function openEditableTemplate(prefsPage: Page): Promise<void> {
  await prefsPage.waitForLoadState('domcontentloaded')
  await prefsPage.getByRole('link', { name: 'Prompt Templates' }).click()
  await prefsPage.locator('button[aria-label="Template actions"]').first().click()
  await prefsPage.getByText('Duplicate & Customise').click()
  await expect(prefsPage.getByTestId('template-name')).toBeVisible()
}

test.describe('Output section drag-and-drop reordering', () => {
  test('dragging a handle reorders sections and marks the form dirty', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await openEditableTemplate(prefsPage)

    const rows = prefsPage.getByTestId('output-section-row')
    await expect(rows).toHaveCount(4)
    const before = await rows.allTextContents()
    expect(before[0]).toContain('Key Points')
    expect(before[1]).toContain('Action Items')

    const saveButton = prefsPage.getByRole('button', { name: 'Save Changes' })
    await expect(saveButton).toBeDisabled()

    const firstHandle = rows.nth(0).getByRole('button', { name: 'Drag to reorder section' })
    const thirdRow = rows.nth(2)

    await thirdRow.scrollIntoViewIfNeeded()
    const handleBox = await firstHandle.boundingBox()
    const targetBox = await thirdRow.boundingBox()
    if (!handleBox || !targetBox) throw new Error('Could not measure row positions')

    await prefsPage.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    )
    await prefsPage.mouse.down()
    await prefsPage.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2 + 10,
      { steps: 5 }
    )
    await prefsPage.waitForTimeout(50)
    await prefsPage.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 4, { steps: 15 })
    await prefsPage.waitForTimeout(50)
    await prefsPage.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 6, { steps: 3 })
    await prefsPage.waitForTimeout(50)
    await prefsPage.mouse.up()
    await prefsPage.waitForTimeout(100)

    const after = await rows.allTextContents()
    expect(after).not.toEqual(before)
    expect(after.join('|')).not.toContain('Key Points|Action Items')

    await expect(saveButton).toBeEnabled()

    await app.close()
    cleanup()
  })

  test('reordering via keyboard works with the drag handle focused', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await openEditableTemplate(prefsPage)

    const rows = prefsPage.getByTestId('output-section-row')
    const before = await rows.allTextContents()

    const firstHandle = rows.nth(0).getByRole('button', { name: 'Drag to reorder section' })
    await firstHandle.scrollIntoViewIfNeeded()
    await firstHandle.focus()
    await prefsPage.keyboard.press('Space')
    await prefsPage.waitForTimeout(80)
    await prefsPage.keyboard.press('ArrowDown')
    await prefsPage.waitForTimeout(80)
    await prefsPage.keyboard.press('ArrowDown')
    await prefsPage.waitForTimeout(80)
    await prefsPage.keyboard.press('Space')
    await prefsPage.waitForTimeout(100)

    const after = await rows.allTextContents()
    expect(after).not.toEqual(before)

    await expect(prefsPage.getByRole('button', { name: 'Save Changes' })).toBeEnabled()

    await app.close()
    cleanup()
  })

  test('single section renders without a drop indicator and is not draggable-broken', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    const [prefsPage] = await Promise.all([
      app.waitForEvent('window'),
      page.getByTestId('prefs-button').click()
    ])
    await openEditableTemplate(prefsPage)

    const rows = prefsPage.getByTestId('output-section-row')
    const count = await rows.count()
    // Delete down to a single section.
    for (let i = 0; i < count - 1; i++) {
      await rows.first().hover()
      await rows.first().getByRole('button', { name: 'Delete section' }).click()
    }
    await expect(rows).toHaveCount(1)
    await expect(prefsPage.getByTestId('drop-indicator')).toHaveCount(0)

    await app.close()
    cleanup()
  })
})
