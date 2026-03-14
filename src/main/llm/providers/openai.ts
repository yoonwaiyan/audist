import OpenAI from 'openai'
import { getCredential } from '../../store'
import type { LLMProvider, LLMMessage, LLMOptions, TestConnectionResult } from '../types'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly availableModels = ['gpt-4o', 'gpt-4o-mini']

  isConfigured(): boolean {
    return !!getCredential('openai.apiKey')
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now()
    try {
      const client = new OpenAI({ apiKey: getCredential('openai.apiKey') })
      const models = await client.models.list()
      const available = models.data.map((m) => m.id)
      return {
        success: true,
        model: available.includes('gpt-4o') ? 'gpt-4o' : (available[0] ?? 'gpt-4o'),
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
    const client = new OpenAI({ apiKey: getCredential('openai.apiKey') })
    const response = await client.chat.completions.create({
      model: options.model,
      messages,
      max_tokens: options.maxTokens ?? 1500,
      temperature: options.temperature ?? 0.3
    })
    return response.choices[0]?.message.content ?? ''
  }
}
