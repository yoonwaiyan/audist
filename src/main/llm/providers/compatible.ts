import OpenAI from 'openai'
import { getCredential, getLLMSettings } from '../../store'
import type { LLMProvider, LLMMessage, LLMOptions, TestConnectionResult } from '../types'
import { LLMError } from '../types'

export class CompatibleProvider implements LLMProvider {
  readonly name = 'compatible'
  readonly availableModels: string[] = [] // free-text model name — no fixed list

  isConfigured(): boolean {
    return !!this.getBaseUrl()
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now()
    const baseUrl = this.getBaseUrl()
    try {
      const client = new OpenAI({
        apiKey: this.getApiKey() || 'local',
        baseURL: baseUrl
      })
      const resp = await client.models.list()
      const models = resp.data.map((m) => m.id)
      const first = models[0] ?? 'unknown'
      return {
        success: true,
        model: first,
        models,
        latencyMs: Date.now() - start
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; status?: number }
      const isConnRefused =
        e?.code === 'ECONNREFUSED' || e?.message?.includes('ECONNREFUSED') || e?.message?.includes('fetch failed')
      return {
        success: false,
        code: isConnRefused ? 'CONNECTION_ERROR' : 'API_ERROR',
        message: isConnRefused
          ? `Cannot reach local runtime at ${baseUrl}. Is it running?`
          : (e?.message ?? 'Unknown error')
      }
    }
  }

  async complete(messages: LLMMessage[], options: LLMOptions): Promise<string> {
    const baseUrl = this.getBaseUrl()
    try {
      const client = new OpenAI({
        apiKey: this.getApiKey() || 'local',
        baseURL: baseUrl
      })
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
        throw new LLMError('AUTH_ERROR', 'API key rejected. Check your credentials in Settings.')
      if (status === 429)
        throw new LLMError('RATE_LIMIT', 'Rate limit reached. Wait a moment and retry.')
      if (errCode === 'context_length_exceeded')
        throw new LLMError(
          'CONTEXT_TOO_LONG',
          'Transcript too long for this model. Try a shorter recording or switch to a larger model.'
        )
      if (status === 408 || e?.message?.includes('timeout'))
        throw new LLMError('TIMEOUT', 'Request timed out. Check your connection and retry.')
      if (!status || e?.message?.includes('ECONNREFUSED') || e?.message?.includes('fetch failed'))
        throw new LLMError(
          'CONNECTION_ERROR',
          `Cannot reach local runtime at ${baseUrl}. Is it running?`
        )
      throw new LLMError('API_ERROR', `Summarisation failed: ${e?.message ?? 'Unknown error'}`)
    }
  }

  private getBaseUrl(): string {
    return getLLMSettings().compatibleBaseUrl ?? ''
  }

  private getApiKey(): string {
    return getCredential('compatible.apiKey') ?? ''
  }
}
