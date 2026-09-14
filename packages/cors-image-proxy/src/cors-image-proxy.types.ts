/** `RequestInit` extended with the Cloudflare Workers `cf` fetch options. */
export interface RequestInitWithCf extends RequestInit {
  /** Cloudflare-specific fetch options; the proxy sets `cacheTtl` and `cacheEverything`. */
  cf?: Record<string, unknown>
}

/** Minimal `fetch` signature the proxy uses to request upstream images. */
export type FetchLike = (
  input: string,
  init?: RequestInitWithCf,
) => Promise<Response>

/** Request handler returned by `corsImageProxy`. */
export type CorsImageProxyHandler = (request: Request) => Promise<Response>

/** Options for `corsImageProxy`. */
export interface CorsImageProxyOptions {
  /**
   * Client origins allowed to use the proxy. Supports `*.example.com` wildcards.
   *
   * Plain entries must equal the `Origin` header exactly (e.g.
   * `http://localhost:3000`). Wildcard entries match the origin's hostname
   * against the bare domain or any subdomain, regardless of scheme or port.
   */
  allowedOrigins: string[]
  /**
   * Image host domains the proxy is allowed to fetch from (prevents open proxy).
   *
   * A target matches when its hostname equals an entry or is a subdomain of it.
   */
  allowedTargetDomains: string[]
  /**
   * Cache lifetime in seconds for upstream responses. Used for the Cloudflare
   * `cf.cacheTtl` and the response `Cache-Control: public, max-age` header.
   *
   * @default 3600
   */
  cacheTtl?: number
  /** Fetch implementation, injectable for testing. Defaults to global fetch. */
  fetch?: FetchLike
}
