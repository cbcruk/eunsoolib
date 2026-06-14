export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false

  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true

    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1)
      try {
        const { hostname } = new URL(origin)
        return hostname === suffix.slice(1) || hostname.endsWith(suffix)
      } catch {
        return false
      }
    }

    return false
  })
}

export function isTargetAllowed(
  url: URL,
  allowedTargetDomains: string[],
): boolean {
  return allowedTargetDomains.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  )
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}
