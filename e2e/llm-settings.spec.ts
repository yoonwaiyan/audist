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
  test('shows all three provider tabs', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs()
    try {
      await expect(prefsPage.getByRole('button', { name: 'OpenAI', exact: true })).toBeVisible()
      await expect(prefsPage.getByRole('button', { name: 'Anthropic', exact: true })).toBeVisible()
      await expect(prefsPage.getByRole('button', { name: 'OpenAI-compatible', exact: true })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('switching tabs shows the correct provider form', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      // OpenAI tab is active by default — API key input visible
      await expect(prefsPage.getByPlaceholder('Paste API key…')).toBeVisible()

      // Switch to Anthropic
      await prefsPage.getByRole('button', { name: 'Anthropic', exact: true }).click()
      await expect(prefsPage.getByPlaceholder('Paste API key…')).toBeVisible()

      // Switch to OpenAI-compatible
      await prefsPage.getByRole('button', { name: 'OpenAI-compatible', exact: true }).click()
      await expect(prefsPage.getByPlaceholder('http://localhost:11434/v1')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('defaults to OpenAI tab with model and API key fields', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      // OpenAI tab selected by default — both form fields present
      await expect(prefsPage.getByRole('button', { name: 'OpenAI', exact: true })).toBeVisible()
      await expect(prefsPage.getByPlaceholder('Paste API key…')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('model select is populated after successful connection test', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText(/Connected/)).toBeVisible({ timeout: 3000 })

      // Model dropdown should now appear after successful connection
      await expect(prefsPage.getByTestId('model-dropdown')).toBeVisible()
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

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic tab
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — Anthropic tab', () => {
  test('shows API key field and Test Connection button', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      await prefsPage.getByRole('button', { name: 'Anthropic', exact: true }).click()
      await expect(prefsPage.getByPlaceholder('Paste API key…')).toBeVisible()
      await expect(prefsPage.getByRole('button', { name: 'Test Connection' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('model dropdown appears after successful test connection', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await prefsPage.getByRole('button', { name: 'Anthropic', exact: true }).click()
      await prefsPage.getByRole('button', { name: 'Test Connection' }).click()
      await expect(prefsPage.getByText(/Connected · \d+ ms/)).toBeVisible({ timeout: 3000 })

      const modelDropdown = prefsPage.getByTestId('model-dropdown')
      await expect(modelDropdown).toBeVisible()
      await modelDropdown.getByRole('button').first().click()
      const panel = prefsPage.getByTestId('model-dropdown-panel')
      await expect(panel.getByRole('button', { name: 'claude-sonnet-4-5' })).toBeVisible()
      await expect(panel.getByRole('button', { name: 'claude-haiku-4-5' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows AUTH_ERROR for invalid key', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('auth_error')
    try {
      await prefsPage.getByRole('button', { name: 'Anthropic', exact: true }).click()
      await prefsPage.getByRole('button', { name: 'Test Connection' }).click()
      await expect(prefsPage.getByText('Invalid API key')).toBeVisible({ timeout: 3000 })
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI-compatible tab
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — OpenAI-compatible tab', () => {
  test('shows base URL and optional API key fields', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      await prefsPage.getByRole('button', { name: 'OpenAI-compatible', exact: true }).click()
      await expect(prefsPage.getByPlaceholder('http://localhost:11434/v1')).toBeVisible()
      await expect(prefsPage.getByText('API Key (optional)')).toBeVisible()
      await expect(prefsPage.getByRole('button', { name: 'Test Connection' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows hint to run Test Connection when base URL entered but no models loaded', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithPrefsNoMock()
    try {
      await prefsPage.getByRole('button', { name: 'OpenAI-compatible', exact: true }).click()
      await prefsPage.getByPlaceholder('http://localhost:11434/v1').fill('http://localhost:11434/v1')
      await prefsPage.getByPlaceholder('http://localhost:11434/v1').blur()
      await expect(prefsPage.getByText(/Run "Test Connection" to load available models/)).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('model dropdown appears after successful test connection', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await prefsPage.getByRole('button', { name: 'OpenAI-compatible', exact: true }).click()
      await prefsPage.getByPlaceholder('http://localhost:11434/v1').fill('http://localhost:11434/v1')
      await prefsPage.getByPlaceholder('http://localhost:11434/v1').blur()
      await prefsPage.getByRole('button', { name: 'Test Connection' }).click()
      await expect(prefsPage.getByText(/Connected · \d+ ms/)).toBeVisible({ timeout: 3000 })

      const modelDropdown = prefsPage.getByTestId('model-dropdown')
      await expect(modelDropdown).toBeVisible()
      await modelDropdown.getByRole('button').first().click()
      const panel = prefsPage.getByTestId('model-dropdown-panel')
      await expect(panel.getByRole('button', { name: 'ollama-llama3' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Field ordering — credentials before model
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LLM settings — field ordering', () => {
  test('model dropdown is hidden before test, appears after success on OpenAI tab', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await expect(prefsPage.getByTestId('model-dropdown')).not.toBeVisible()
      await expect(prefsPage.getByText('API Key', { exact: true })).toBeVisible()
      await expect(prefsPage.getByRole('button', { name: 'Test Connection' })).toBeVisible()

      await prefsPage.getByRole('button', { name: 'Test Connection' }).first().click()
      await expect(prefsPage.getByText(/Connected/)).toBeVisible({ timeout: 3000 })
      await expect(prefsPage.getByTestId('model-dropdown')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('model dropdown is hidden before test, appears after success on Anthropic tab', async () => {
    const { app, prefsPage, cleanup, saveDir } = await launchWithLLMPrefs('success')
    try {
      await prefsPage.getByRole('button', { name: 'Anthropic', exact: true }).click()
      await expect(prefsPage.getByTestId('model-dropdown')).not.toBeVisible()
      await expect(prefsPage.getByText('API Key', { exact: true })).toBeVisible()

      await prefsPage.getByRole('button', { name: 'Test Connection' }).click()
      await expect(prefsPage.getByText(/Connected/)).toBeVisible({ timeout: 3000 })
      await expect(prefsPage.getByTestId('model-dropdown')).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Main window — LLM selector
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Main window — LLM selector', () => {
  test('LLM button is disabled and shows Not configured when no provider is set', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })
    try {
      const llmBtn = page.getByRole('button', { name: /Summarise with/ })
      await expect(llmBtn).toBeVisible()
      await expect(llmBtn).toBeDisabled()
      await expect(llmBtn).toContainText('Not configured')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows "set one up" link when no provider is configured', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })
    try {
      await expect(page.getByText(/No AI provider configured/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'set one up' })).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows OpenAI provider and selected model when configured', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      llm: 'success',
      llmSettings: {
        activeProvider: 'openai',
        models: { openai: 'gpt-4o' },
        cachedModels: { openai: ['gpt-4o', 'gpt-4o-mini'] }
      }
    })
    try {
      const llmBtn = page.getByRole('button', { name: /Summarise with/ })
      await expect(llmBtn).toBeEnabled()
      await expect(llmBtn).toContainText('OpenAI')
      await expect(llmBtn).toContainText('gpt-4o')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('shows Anthropic provider and selected model when configured', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      llm: 'success',
      llmSettings: {
        activeProvider: 'anthropic',
        models: { anthropic: 'claude-haiku-4-5' },
        cachedModels: { anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5'] }
      }
    })
    try {
      const llmBtn = page.getByRole('button', { name: /Summarise with/ })
      await expect(llmBtn).toBeEnabled()
      await expect(llmBtn).toContainText('Anthropic')
      await expect(llmBtn).toContainText('claude-haiku-4-5')
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('dropdown lists configured providers with their models', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      llm: 'success',
      llmSettings: {
        activeProvider: 'openai',
        models: { openai: 'gpt-4o', anthropic: 'claude-haiku-4-5' },
        cachedModels: {
          openai: ['gpt-4o', 'gpt-4o-mini'],
          anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5']
        }
      }
    })
    try {
      await page.getByRole('button', { name: /Summarise with/ }).click()
      // Both providers should appear in the dropdown
      await expect(page.getByText('OpenAI').last()).toBeVisible()
      await expect(page.getByText('gpt-4o').last()).toBeVisible()
      await expect(page.getByText('Anthropic').last()).toBeVisible()
      await expect(page.getByText('claude-haiku-4-5').last()).toBeVisible()
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
