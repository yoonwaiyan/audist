import type { OutputSection, PromptTemplate } from './types'

interface BuiltinSectionSeed {
  heading: string
  instruction: string
}

interface BuiltinTemplateSeed {
  id: string
  name: string
  description: string
  systemPrompt: string
  sections: BuiltinSectionSeed[]
}

// Deterministic IDs so re-seeding is idempotent across app launches.
const BUILTIN_SEEDS: BuiltinTemplateSeed[] = [
  {
    id: 'builtin-default',
    name: 'Default Meeting Notes',
    description: 'Key points, action items, decisions, and open questions',
    systemPrompt:
      'You are an expert meeting assistant. Produce a concise, structured Markdown summary. Output only the summary — no preamble.',
    sections: [
      { heading: 'Key Points', instruction: 'Bullet list of the most important discussion points' },
      { heading: 'Action Items', instruction: 'Checkbox list: - [ ] Owner: description' },
      { heading: 'Decisions Made', instruction: 'Bullet list of decisions reached during the meeting' },
      {
        heading: 'Open Questions',
        instruction: 'Bullet list of unresolved questions or topics needing follow-up'
      }
    ]
  },
  {
    id: 'builtin-standup',
    name: 'Standup Sync',
    description: 'Yesterday, today, and blockers for daily standups',
    systemPrompt:
      'You are a scrum meeting assistant. Produce a brief standup summary in Markdown. Output only the summary.',
    sections: [
      { heading: 'Yesterday', instruction: 'What was completed since the last standup' },
      { heading: 'Today', instruction: 'What each person plans to work on today' },
      { heading: 'Blockers', instruction: 'Any impediments or blockers raised' }
    ]
  },
  {
    id: 'builtin-1on1',
    name: '1:1 Check-In',
    description: 'Talking points, feedback, growth, and follow-ups for 1:1s',
    systemPrompt:
      'You are a meeting assistant specialising in 1:1 check-ins. Summarise the conversation with empathy and precision. Output Markdown only.',
    sections: [
      { heading: 'Talking Points', instruction: 'Key topics discussed' },
      { heading: 'Feedback', instruction: 'Any feedback given or received' },
      { heading: 'Career / Growth', instruction: 'Career development or growth topics mentioned' },
      { heading: 'Follow-ups', instruction: 'Action items and follow-up commitments' }
    ]
  },
  {
    id: 'builtin-client-discovery',
    name: 'Client Discovery Call',
    description: 'Client background, pain points, requirements, and next steps',
    systemPrompt:
      'You are a business analyst assistant. Summarise this client discovery call. Be thorough on requirements and pain points. Markdown only.',
    sections: [
      { heading: 'Client Background', instruction: 'Brief context on the client and their business' },
      { heading: 'Pain Points', instruction: 'Problems or frustrations the client described' },
      { heading: 'Requirements', instruction: 'Specific requirements or feature requests mentioned' },
      { heading: 'Next Steps', instruction: 'Agreed next steps and owners' }
    ]
  }
]

export const DEFAULT_BUILTIN_TEMPLATE_ID = 'builtin-default'

/** Builds fresh built-in template objects with deterministic ids, stamped with `now`. */
export function createBuiltinTemplates(now: string = new Date().toISOString()): PromptTemplate[] {
  return BUILTIN_SEEDS.map((seed) => {
    const outputSections: OutputSection[] = seed.sections.map((section, index) => ({
      id: `${seed.id}-section-${index}`,
      heading: section.heading,
      instruction: section.instruction,
      order: index
    }))

    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      isBuiltIn: true,
      isActive: seed.id === DEFAULT_BUILTIN_TEMPLATE_ID,
      systemPrompt: seed.systemPrompt,
      outputSections,
      createdAt: now,
      updatedAt: now
    }
  })
}
