import { WebIdentityError, type WebIdentityErrorCode } from './types'

/**
 * Encode a Uint8Array to a Base64URL string.
 */
export function toBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a Base64URL string to a Uint8Array.
 */
export function fromBase64URL(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Wrap native credential errors into WebIdentityError.
 */
export function wrapError(error: unknown): WebIdentityError {
  if (error instanceof WebIdentityError) return error

  if (error instanceof DOMException) {
    const codeMap: Record<string, WebIdentityErrorCode> = {
      NotSupportedError: 'NOT_SUPPORTED',
      NotAllowedError: 'NOT_ALLOWED',
      AbortError: 'ABORTED',
      InvalidStateError: 'INVALID_STATE',
      SecurityError: 'SECURITY_ERROR',
      NetworkError: 'NETWORK_ERROR',
    }
    const code = codeMap[error.name] ?? 'UNKNOWN'
    return new WebIdentityError(code, error.message, error)
  }

  if (error instanceof Error) {
    return new WebIdentityError('UNKNOWN', error.message, error)
  }

  return new WebIdentityError('UNKNOWN', String(error), error)
}

/**
 * Check if navigator.credentials is available (secure context).
 */
export function assertCredentialsAPI(): void {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new WebIdentityError(
      'SECURITY_ERROR',
      'Credential Manager requires a secure context (HTTPS).',
    )
  }
  if (!navigator.credentials) {
    throw new WebIdentityError(
      'NOT_SUPPORTED',
      'Credential Manager API is not supported in this browser.',
    )
  }
}
