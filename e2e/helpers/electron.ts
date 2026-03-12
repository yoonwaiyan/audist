import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [
      path.join(__dirname, '../../out/main/index.js'),
      // Required on Linux CI — Electron's Chromium sandbox needs user namespaces
      // which are restricted on most CI runners.
      '--no-sandbox',
    ],
  })
  const page = await app.firstWindow()
  // Wait for the renderer to finish loading before returning
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}
