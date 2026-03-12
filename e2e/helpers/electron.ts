import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface LaunchResult {
  app: ElectronApplication
  page: Page
  cleanup: () => void
}

/**
 * Launch the app with an isolated userData directory.
 *
 * @param saveDirectory
 *   - omit / undefined → no settings.json (first-launch state, lands on /setup)
 *   - string           → pre-configure this path as the save directory (lands on /)
 */
export async function launchApp(opts?: { saveDirectory?: string }): Promise<LaunchResult> {
  const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-test-'))

  if (opts?.saveDirectory !== undefined) {
    fs.writeFileSync(
      path.join(tmpUserData, 'settings.json'),
      JSON.stringify({ saveDirectory: opts.saveDirectory })
    )
  }

  const app = await electron.launch({
    args: [
      path.join(__dirname, '../../out/main/index.js'),
      '--no-sandbox',
      `--user-data-dir=${tmpUserData}`
    ]
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  const cleanup = (): void => {
    try {
      fs.rmSync(tmpUserData, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }

  return { app, page, cleanup }
}

/**
 * Convenience: launch with an existing temp save directory (main-window flow).
 * The save directory is also cleaned up when cleanup() is called.
 */
export async function launchAppWithSaveDir(): Promise<LaunchResult> {
  const tmpSaveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
  const result = await launchApp({ saveDirectory: tmpSaveDir })
  return {
    ...result,
    cleanup: () => {
      result.cleanup()
      try {
        fs.rmSync(tmpSaveDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  }
}
