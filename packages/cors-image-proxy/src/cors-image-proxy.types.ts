export interface RequestInitWithCf extends RequestInit {
  cf?: Record<string, unknown>
}

export type FetchLike = (
  input: string,
  init?: RequestInitWithCf,
) => Promise<Response>

export type CorsImageProxyHandler = (request: Request) => Promise<Response>

export interface CorsImageProxyOptions {
  /** Client origins allowed to use the proxy. Supports `*.example.com` wildcards. */
  allowedOrigins: string[]
  /** Image host domains the proxy is allowed to fetch from (prevents open proxy). */
  allowedTargetDomains: string[]
  /** Cache lifetime in seconds for upstream responses. Defaults to 3600. */
  cacheTtl?: number
  /** Fetch implementation, injectable for testing. Defaults to global fetch. */
  fetch?: FetchLike
}
