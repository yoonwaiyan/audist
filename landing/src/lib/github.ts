export interface ReleaseAsset {
  id: number
  name: string
  browser_download_url: string
  size: number
  download_count: number
  content_type: string
}

export interface Release {
  id: number
  name: string | null
  tag_name: string
  body: string | null
  html_url: string
  published_at: string
  prerelease: boolean
  draft: boolean
  assets: ReleaseAsset[]
}

const API_URL = 'https://api.github.com/repos/yoonwaiyan/audist/releases'

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'audist-landing-build'
  }

  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function getReleases(): Promise<Release[]> {
  const response = await fetch(API_URL, { headers: getHeaders() })

  if (!response.ok) {
    throw new Error(`GitHub releases request failed with ${response.status}`)
  }

  const releases = (await response.json()) as Release[]
  return releases.filter((release) => !release.draft)
}

export async function getReleasesSafe(): Promise<Release[]> {
  try {
    return await getReleases()
  } catch (error) {
    console.warn('Unable to fetch GitHub releases during build.', error)
    return []
  }
}

export function formatReleaseDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(isoDate))
}

export function formatAssetSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function summarizeReleaseBody(body: string | null): string[] {
  if (!body) {
    return ['Release notes are available on GitHub.']
  }

  return body
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
}
