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
 * @param opts.saveDirectory
 *   - omit / undefined → no settings.json (first-launch state, lands on /setup)
 *   - string           → pre-configure this path as the save directory
 *
 * @param opts.permissions
 *   - 'granted'        → bypass OS permission check, both treated as granted (default)
 *   - 'not-determined' → simulate a fresh macOS install, lands on /permissions
 *   - 'denied'         → simulate both permissions denied, shows blocked state
 */
export async function launchApp(opts?: {
  saveDirectory?: string
  permissions?: 'granted' | 'not-determined' | 'denied'
}): Promise<LaunchResult> {
  const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-test-'))

  if (opts?.saveDirectory !== undefined) {
    fs.writeFileSync(
      path.join(tmpUserData, 'settings.json'),
      JSON.stringify({ saveDirectory: opts.saveDirectory })
    )
  }

  const permissionsOverride = opts?.permissions ?? 'granted'

  const app = await electron.launch({
    args: [
      path.join(__dirname, '../../out/main/index.js'),
      '--no-sandbox',
      `--user-data-dir=${tmpUserData}`
    ],
    env: {
      ...process.env,
      AUDIST_TEST_PERMISSIONS: permissionsOverride
    }
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
 * Convenience: launch with an existing temp save directory and permissions granted.
 * The app will land on the main recording UI (/).
 * The save directory is also cleaned up when cleanup() is called.
 */
export async function launchAppWithSaveDir(): Promise<LaunchResult> {
  const tmpSaveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
  const result = await launchApp({ saveDirectory: tmpSaveDir, permissions: 'granted' })
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
