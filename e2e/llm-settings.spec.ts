import { test, expect } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { launchApp, openLLMPrefsPage } from './helpers/electron'

function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function launchWithLLMPrefs(
  llm: 'success' | 'auth_error' | 'rate_limit' | 'connection_error' = 'success'
) {
  const saveDir = makeSaveDir()
  const result = await launchApp({
    saveDirectory: saveDir,
    permissions: 'granted',
    whisper: 'ready',
    llm
  })
  const prefsPage = await openLLMPrefsPage(result.app, result.page)
  return { ...result, prefsPage, saveDir }
}

/** Launch without LLM mock so real credential checks work (for API key field tests). */
async function launchWithPrefsNoMock() {
  const saveDir = makeSaveDir()
  const result = await launchApp({
    saveDirectory: saveDir,
    permissions: 'granted',
    whisper: 'ready'
  })
  const prefsPage = await openLLMPrefsPage(result.app, result.page)
  return { ...result, prefsPage, saveDir }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout & structure
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — layout', () => {
  test('shows all three provider sections', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs()
    try {
      await expect(prefsPage.getByRole('heading', { name: 'OpenAI', exact: true })).toBeVisible()
      await expect(prefsPage.getByRole('heading', { name: 'Anthropic', exact: true })).toBeVisible()
      await expect(prefsPage.getByRole('heading', { name: /OpenAI-compatible/ })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('has separator lines between provider sections', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs()
    try {
      // Two <hr>-equivalent dividers sit between the three sections
      const dividers = prefsPage.locator('.border-t.border-\\[var\\(--color-border\\)\\]')
      await expect(dividers).toHaveCount(2)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows placeholder when no provider has been tested yet', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      await expect(prefsPage.getByText('Test a connection below to make a provider available.')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('provider appears in dropdown after successful test', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      // Run Test Connection for OpenAI
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText(/Connected/)).toBeVisible({ timeout: 3000 })

      // The select should now contain OpenAI as an option
      const select = prefsPage.locator('select').first()
      await expect(select).toBeVisible()
      await expect(select.locator('option', { hasText: 'OpenAI' })).toHaveCount(1)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// API key field
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — API key field', () => {
  test('Test Connection button is disabled when no API key is stored', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      llm: 'success'
    })
    try {
      // Use a fresh app without mock so isConfigured() returns false (no key stored)
      const saveDir2 = makeSaveDir()
      const { app: app2, page: page2, cleanup: cleanup2 } = await launchApp({
        saveDirectory: saveDir2,
        permissions: 'granted',
        whisper: 'ready'
        // No llm mock → real OpenAI provider → isConfigured() = false (no key stored)
      })
      const prefsPage = await openLLMPrefsPage(app2, page2)

      // The Test Connection buttons should all be disabled (no keys stored)
      const testButtons = prefsPage.getByRole('button', { name: 'Test Connection' })
      for (const btn of await testButtons.all()) {
        await expect(btn).toBeDisabled()
      }

      await app2.close()
      cleanup2()
      fs.rmSync(saveDir2, { recursive: true, force: true })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('saving an API key shows masked placeholder', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      // Fill in and save the OpenAI key
      await prefsPage.getByPlaceholder('Paste API key…').first().fill('sk-test-key-12345')
      await prefsPage.getByRole('button', { name: 'Save' }).first().click()

      // Masked placeholder should appear
      await expect(prefsPage.getByText('••••••••••••••••').first()).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('clearing an API key returns to input state', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      await prefsPage.getByPlaceholder('Paste API key…').first().fill('sk-test-key-12345')
      await prefsPage.getByRole('button', { name: 'Save' }).first().click()
      await expect(prefsPage.getByText('••••••••••••••••').first()).toBeVisible()

      await prefsPage.getByRole('button', { name: 'Clear' }).first().click()

      await expect(prefsPage.getByPlaceholder('Paste API key…').first()).toBeVisible()
      await expect(prefsPage.getByText('••••••••••••••••')).not.toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test Connection — success
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — Test Connection (mocked OpenAI)', () => {
  test('shows Connected state with latency on success', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      const testBtn = prefsPage.getByRole('button', { name: 'Test Connection' }).first()
      await testBtn.click()

      // Button transitions to success — latency is present
      await expect(prefsPage.getByText(/Connected · \d+ ms/)).toBeVisible({ timeout: 3000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('success state auto-clears after 8 seconds', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText(/Connected · \d+ ms/)).toBeVisible({ timeout: 3000 })

      // After 8s the button resets to idle
      await expect(prefsPage.getByRole('button', { name: 'Test Connection' }).first()).toBeVisible({
        timeout: 10000
      })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  // ─── Error states ──────────────────────────────────────────────────────────

  test('shows Invalid API key for AUTH_ERROR', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('auth_error')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()

      await expect(prefsPage.getByText('Invalid API key')).toBeVisible({ timeout: 3000 })
      await expect(prefsPage.getByText(/Incorrect API key provided/)).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows Rate limited for RATE_LIMIT', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('rate_limit')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()

      await expect(prefsPage.getByText('Rate limited')).toBeVisible({ timeout: 3000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test("shows Can't connect for CONNECTION_ERROR", async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('connection_error')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()

      await expect(prefsPage.getByText("Can't connect")).toBeVisible({ timeout: 3000 })
      await expect(prefsPage.getByText(/Failed to connect to API endpoint/)).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('error state persists (does not auto-clear)', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('auth_error')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText('Invalid API key')).toBeVisible({ timeout: 3000 })

      // Wait beyond the 8s success-clear window — error should still be visible
      await prefsPage.waitForTimeout(9000)
      await expect(prefsPage.getByText('Invalid API key')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('new test run replaces previous result immediately', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('auth_error')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText('Invalid API key').first()).toBeVisible({ timeout: 3000 })

      // Click the button again (it now shows "✕ Invalid API key") — loading replaces the error
      await prefsPage.getByRole('button', { name: /Invalid API key/ }).first().click()
      await expect(prefsPage.getByText('Testing…').first()).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
