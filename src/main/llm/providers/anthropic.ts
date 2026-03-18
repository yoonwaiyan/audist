import Anthropic from '@anthropic-ai/sdk'
import { getCredential } from '../../store'
import type { LLMProvider, LLMMessage, LLMOptions, TestConnectionResult } from '../types'
import { LLMError } from '../types'

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  readonly availableModels = ['claude-sonnet-4-5', 'claude-haiku-4-5']

  isConfigured(): boolean {
    return !!getCredential('anthropic.apiKey')
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now()
    try {
      const client = new Anthropic({ apiKey: getCredential('anthropic.apiKey') })
      // 1-token completion — cheapest real call that validates the key
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      })
      return {
        success: true,
        model: 'claude-haiku-4-5',
        models: this.availableModels,
        latencyMs: Date.now() - start
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      const status = e?.status
      return {
        success: false,
        code: status === 401 ? 'AUTH_ERROR' : status === 429 ? 'RATE_LIMIT' : 'CONNECTION_ERROR',
        message: e?.message ?? 'Unknown error'
      }
    }
  }

  async complete(messages: LLMMessage[], options: LLMOptions): Promise<string> {
    try {
      const client = new Anthropic({ apiKey: getCredential('anthropic.apiKey') })
      const system = messages.find((m) => m.role === 'system')?.content ?? ''
      const userMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const response = await client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens ?? 1500,
        system,
        messages: userMessages
      })

      return response.content[0]?.type === 'text' ? response.content[0].text : ''
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      const status = e?.status
      if (status === 401)
        throw new LLMError('AUTH_ERROR', 'API key rejected. Check your Anthropic key in Settings.')
      if (status === 429)
        throw new LLMError('RATE_LIMIT', 'Rate limit reached. Wait a moment and retry.')
      if (status === 408 || e?.message?.includes('timeout'))
        throw new LLMError('TIMEOUT', 'Request timed out. Check your connection and retry.')
      if (!status || e?.message?.includes('ECONNREFUSED') || e?.message?.includes('fetch failed'))
        throw new LLMError('CONNECTION_ERROR', 'Cannot reach Anthropic. Check your connection and retry.')
      throw new LLMError('API_ERROR', `Summarisation failed: ${e?.message ?? 'Unknown error'}`)
    }
  }
}
