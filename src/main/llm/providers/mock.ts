import type { LLMProvider, LLMMessage, LLMOptions, TestConnectionResult } from '../types'

/**
 * Mock LLM provider for e2e tests.
 * Behaviour is controlled by the AUDIST_TEST_LLM env var:
 *   'success'          → { success: true, model: 'gpt-4o', latencyMs: 50 }
 *   'auth_error'       → { success: false, code: 'AUTH_ERROR', ... }
 *   'rate_limit'       → { success: false, code: 'RATE_LIMIT', ... }
 *   'connection_error' → { success: false, code: 'CONNECTION_ERROR', ... }
 */
export class MockLLMProvider implements LLMProvider {
  readonly name: string
  readonly availableModels: string[]

  constructor(name: string, models: string[]) {
    this.name = name
    this.availableModels = models
  }

  isConfigured(): boolean {
    // Always configured in mock mode so the Test Connection button is always enabled
    return true
  }

  async testConnection(): Promise<TestConnectionResult> {
    // Simulate a small network round-trip
    await new Promise((r) => setTimeout(r, 50))

    const mode = (process.env['AUDIST_TEST_LLM'] ?? 'success').toLowerCase()

    if (mode === 'success') {
      return { success: true, model: this.availableModels[0] ?? 'mock-model', latencyMs: 50 }
    }

    const errorMap: Record<string, { code: string; message: string }> = {
      auth_error: {
        code: 'AUTH_ERROR',
        message: 'Incorrect API key provided. You can find your API key at the provider dashboard.'
      },
      rate_limit: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Please try again later.' },
      connection_error: {
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect to API endpoint. Check your network or base URL.'
      }
    }

    const err = errorMap[mode] ?? { code: 'CONNECTION_ERROR', message: 'Unknown mock error' }
    return { success: false, ...err }
  }

  async complete(_messages: LLMMessage[], _options: LLMOptions): Promise<string> {
    return 'Mock LLM response'
  }
}
