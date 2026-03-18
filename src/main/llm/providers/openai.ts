import OpenAI from 'openai'
import { getCredential } from '../../store'
import type { LLMProvider, LLMMessage, LLMOptions, TestConnectionResult } from '../types'
import { LLMError } from '../types'

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
      const resp = await client.models.list()
      const available = resp.data.map((m) => m.id).filter((id) => id.startsWith('gpt-'))
      const best = available.includes('gpt-4o') ? 'gpt-4o' : (available[0] ?? 'gpt-4o')
      return {
        success: true,
        model: best,
        models: available.length > 0 ? available : this.availableModels,
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
      const client = new OpenAI({ apiKey: getCredential('openai.apiKey') })
      const response = await client.chat.completions.create({
        model: options.model,
        messages,
        max_tokens: options.maxTokens ?? 1500,
        temperature: options.temperature ?? 0.3
      })
      return response.choices[0]?.message.content ?? ''
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; error?: { code?: string } }
      const status = e?.status
      const errCode = e?.error?.code
      if (status === 401)
        throw new LLMError('AUTH_ERROR', 'API key rejected. Check your OpenAI key in Settings.')
      if (status === 429)
        throw new LLMError('RATE_LIMIT', 'Rate limit reached. Wait a moment and retry.')
      if (errCode === 'context_length_exceeded')
        throw new LLMError('CONTEXT_TOO_LONG', 'Transcript too long for this model. Try a shorter recording or switch to a larger model.')
      if (status === 408 || e?.message?.includes('timeout'))
        throw new LLMError('TIMEOUT', 'Request timed out. Check your connection and retry.')
      if (!status || e?.message?.includes('ECONNREFUSED') || e?.message?.includes('fetch failed'))
        throw new LLMError('CONNECTION_ERROR', 'Cannot reach OpenAI. Check your connection and retry.')
      throw new LLMError('API_ERROR', `Summarisation failed: ${e?.message ?? 'Unknown error'}`)
    }
  }
}
