export interface OutputSection {
  id: string
  heading: string
  instruction: string
  order: number
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  isBuiltIn: boolean
  isActive: boolean
  systemPrompt: string
  outputSections: OutputSection[]
  createdAt: string
  updatedAt: string
}

export type TemplateVariable =
  | '{{transcript}}'
  | '{{date}}'
  | '{{duration}}'
  | '{{participants}}'
  | '{{meeting_title}}'

export interface PromptTemplatesStore {
  templates: PromptTemplate[]
  activeTemplateId: string
}
