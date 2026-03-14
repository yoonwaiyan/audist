import { getLLMSettings, setLLMSettings, isCredentialSet } from '../store'
import type { LLMProvider, ProviderName } from './types'

class LLMRegistry {
  private providers: Map<string, LLMProvider> = new Map()

  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name)
  }

  getActive(): LLMProvider | undefined {
    const settings = getLLMSettings()

    // Explicit selection
    if (settings.activeProvider) {
      const p = this.providers.get(settings.activeProvider)
      if (p) return p
    }

    // Fallback resolution order: openai → anthropic → compatible
    const fallbackOrder: ProviderName[] = ['openai', 'anthropic', 'compatible']
    for (const name of fallbackOrder) {
      const p = this.providers.get(name)
      if (p?.isConfigured()) return p
    }

    return undefined
  }

  setActive(name: ProviderName): void {
    setLLMSettings({ activeProvider: name })
  }

  listAll(): LLMProvider[] {
    return [...this.providers.values()]
  }
}

export const llmRegistry = new LLMRegistry()

// Check if any provider has a key set (used for fallback detection)
export function isAnyProviderConfigured(): boolean {
  return (
    isCredentialSet('openai.apiKey') ||
    isCredentialSet('anthropic.apiKey') ||
    isCredentialSet('compatible.apiKey')
  )
}
