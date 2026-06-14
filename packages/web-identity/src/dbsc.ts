import type { DBSCRegistrationConfig } from './types'
import { WebIdentityError } from './types'

/**
 * Device Bound Session Credentials (DBSC) utilities.
 *
 * DBSC binds session tokens to the specific device used during login,
 * preventing session hijacking even if cookies are stolen.
 *
 * This is primarily a server-side feature coordinated through HTTP headers,
 * but this module provides client-side helpers for detection and integration.
 *
 * @example
 * ```ts
 * const dbsc = new DBSC();
 *
 * if (DBSC.isSupported()) {
 *   console.log('DBSC is available — sessions can be device-bound.');
 * }
 * ```
 *
 * @see https://developer.chrome.com/docs/web-platform/device-bound-session-credentials
 */
export class DBSC {
  /**
   * Check if DBSC is supported in the current browser.
   *
   * DBSC support is indicated by the browser sending a
   * `Sec-Session-Registration` header in requests.
   */
  static isSupported(): boolean {
    // DBSC is a browser-level feature; client-side detection is limited.
    // The presence is best detected server-side via the Sec-Session-Registration header.
    // Client-side, we can check for the experimental API if exposed.
    if (typeof window === 'undefined') return false
    return 'sessionCredential' in (navigator as any)
  }

  /**
   * Generate the server-side DBSC registration headers.
   *
   * Returns the HTTP response headers your server should send to initiate
   * DBSC registration after successful authentication.
   *
   * @param config - DBSC registration configuration.
   * @returns Headers object to include in your HTTP response.
   */
  static registrationHeaders(
    config: DBSCRegistrationConfig,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Sec-Session-Registration': config.registrationEndpoint,
    }

    if (config.refreshEndpoint) {
      headers['Sec-Session-Registration'] +=
        `; refresh="${config.refreshEndpoint}"`
    }

    return headers
  }

  /**
   * Generate the well-known DBSC configuration path.
   *
   * Browsers may look for this endpoint to discover DBSC support.
   */
  static wellKnownPath(): string {
    return '/.well-known/device-bound-session-credentials'
  }
}
