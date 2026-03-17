import { _electron as electron, ElectronApplication, Page, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface SessionSeed {
  id: string
  duration: number
  status: 'complete' | 'transcribing' | 'error'
  error?: string
  summaryMd?: string
  transcriptTxt?: string
}

/**
 * Seed one or more completed session directories into a save directory.
 * Each session gets a `session.json` with the provided metadata.
 */
export function seedSessions(saveDir: string, sessions: SessionSeed[]): void {
  for (const s of sessions) {
    const sessionDir = path.join(saveDir, s.id)
    fs.mkdirSync(sessionDir, { recursive: true })
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify({ duration: s.duration, status: s.status, ...(s.error ? { error: s.error } : {}) })
    )
    if (s.summaryMd !== undefined) {
      fs.writeFileSync(path.join(sessionDir, 'summary.md'), s.summaryMd, 'utf-8')
    }
    if (s.transcriptTxt !== undefined) {
      fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), s.transcriptTxt, 'utf-8')
    }
  }
}

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
 *
 * @param opts.whisper
 *   - 'ready'          → bypass whisper binary/model check, treated as installed (default)
 *   - 'not-ready'      → simulate first run, whisper not yet bootstrapped
 */
export async function launchApp(opts?: {
  saveDirectory?: string
  permissions?: 'granted' | 'not-determined' | 'denied'
  whisper?: 'ready' | 'not-ready'
  testMode?: boolean
  /** Mock LLM testConnection result: 'success' | 'auth_error' | 'rate_limit' | 'connection_error' */
  llm?: 'success' | 'auth_error' | 'rate_limit' | 'connection_error'
  /** Seed extra LLM settings fields (e.g. { summarisationEnabled: false }) */
  llmSettings?: Record<string, unknown>
  /** Mock the directory picker to return this path instead of showing the OS dialog */
  selectDir?: string
}): Promise<LaunchResult> {
  const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-test-'))

  if (opts?.saveDirectory !== undefined || opts?.llmSettings !== undefined) {
    const settings: Record<string, unknown> = {}
    if (opts?.saveDirectory !== undefined) settings.saveDirectory = opts.saveDirectory
    if (opts?.llmSettings !== undefined) settings.llm = opts.llmSettings
    fs.writeFileSync(path.join(tmpUserData, 'settings.json'), JSON.stringify(settings))
  }

  const permissionsOverride = opts?.permissions ?? 'granted'
  const whisperOverride = opts?.whisper ?? 'ready'

  const app = await electron.launch({
    args: [
      path.join(__dirname, '../../out/main/index.js'),
      '--no-sandbox',
      `--user-data-dir=${tmpUserData}`
    ],
    env: {
      ...process.env,
      AUDIST_TEST_PERMISSIONS: permissionsOverride,
      AUDIST_TEST_WHISPER: whisperOverride,
      ...(opts?.testMode ? { AUDIST_TEST_MODE: '1' } : {}),
      ...(opts?.llm ? { AUDIST_TEST_LLM: opts.llm } : {}),
      ...(opts?.selectDir !== undefined ? { AUDIST_TEST_SELECT_DIR: opts.selectDir } : {})
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
 * Open the prefs window by clicking the gear icon and navigate to the LLM section.
 * Returns the prefs window Page.
 */
export async function openLLMPrefsPage(app: ElectronApplication, mainPage: Page): Promise<Page> {
  const [prefsPage] = await Promise.all([
    app.waitForEvent('window'),
    mainPage.getByTitle('Preferences (⌘,)').click()
  ])
  await prefsPage.waitForLoadState('domcontentloaded')
  await prefsPage.getByRole('link', { name: 'LLM' }).click()
  await expect(prefsPage.getByRole('heading', { name: 'Language Model' })).toBeVisible()
  return prefsPage
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
