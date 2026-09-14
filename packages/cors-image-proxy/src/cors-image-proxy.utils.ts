/**
 * Checks whether a request `Origin` header matches the allowed origins.
 *
 * An entry matches when it equals `origin` exactly, or when it is a
 * `*.domain` wildcard and the origin's hostname is `domain` or a subdomain of it.
 *
 * @param origin - Value of the `Origin` header. `null` is never allowed
 */
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

/**
 * Checks whether a target URL's hostname equals an allowed domain or is a subdomain of one.
 */
export function isTargetAllowed(
  url: URL,
  allowedTargetDomains: string[],
): boolean {
  return allowedTargetDomains.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  )
}

/**
 * Builds the CORS response headers for an allowed origin.
 *
 * @returns Headers that echo `origin` and allow `GET, HEAD, OPTIONS` with
 * `Content-Type`, cached for 86400 seconds
 */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}
