export function withBase(path = ''): string {
  const rawBase = import.meta.env.BASE_URL
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
  const cleanPath = path.replace(/^\/+/, '')

  return cleanPath ? `${base}${cleanPath}` : base
}
