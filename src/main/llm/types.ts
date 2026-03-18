export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  model: string
  maxTokens?: number
  temperature?: number
}

export type TestConnectionResult =
  | { success: true; model: string; models: string[]; latencyMs: number }
  | { success: false; code: string; message: string }

export interface LLMProvider {
  readonly name: string
  readonly availableModels: string[]
  isConfigured(): boolean
  testConnection(): Promise<TestConnectionResult>
  complete(messages: LLMMessage[], options: LLMOptions): Promise<string>
}

/** Typed error thrown by provider.complete() with a machine-readable code. */
export class LLMError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'LLMError'
  }
}

export type ProviderName = 'openai' | 'anthropic' | 'compatible'
