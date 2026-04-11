export const siteConfig = {
  name: 'Audist',
  description:
    'Local-first meeting recorder and transcription app for macOS. Capture meetings, transcribe on device, and generate summaries with the model provider you choose.',
  repoUrl: 'https://github.com/yoonwaiyan/audist',
  issuesUrl: 'https://github.com/yoonwaiyan/audist/issues',
  docsUrl: 'https://github.com/yoonwaiyan/audist#readme',
  releaseUrl: 'https://github.com/yoonwaiyan/audist/releases'
} as const

export const featureCards = [
  {
    icon: 'wave',
    title: 'Local transcription',
    body: 'Record meetings and transcribe them on device with whisper.cpp. Your audio stays on your machine.'
  },
  {
    icon: 'spark',
    title: 'Flexible AI summaries',
    body: 'Generate polished AI meeting summaries with OpenAI, Anthropic, or any OpenAI-compatible endpoint without changing your workflow.'
  },
  {
    icon: 'grid',
    title: 'Built for desktop flow',
    body: 'Fast setup, keyboard-friendly session browsing, and a focused recording surface designed for repeat daily use.'
  }
] as const

export const screenshotCards = [
  {
    eyebrow: 'Capture',
    title: 'Focused recording mode',
    body: 'A deliberate full-screen recording surface with a live waveform, elapsed timer, and one obvious action.'
  },
  {
    eyebrow: 'Review',
    title: 'Session browser and details',
    body: 'Browse recordings, rename sessions, and inspect transcript and summary output without leaving the app shell.'
  },
  {
    eyebrow: 'Configure',
    title: 'Guided setup and preferences',
    body: 'Onboarding and preferences keep storage, permissions, and model configuration understandable instead of hidden.'
  }
] as const
