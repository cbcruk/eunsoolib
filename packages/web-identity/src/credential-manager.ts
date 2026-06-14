import type {
  UnifiedCredentialRequestOptions,
  CredentialResult,
  MediationType,
} from './types'
import { assertCredentialsAPI, wrapError } from './utils'

/**
 * Unified Credential Manager that wraps `navigator.credentials.get()` and
 * `navigator.credentials.create()` to support passwords, passkeys, and
 * federated credentials through a single interface.
 *
 * @example
 * ```ts
 * const cm = new CredentialManager();
 *
 * // Unified sign-in: passwords + passkeys in one prompt
 * const result = await cm.get({
 *   password: true,
 *   publicKey: { challenge, rpId: 'example.com' },
 *   mediation: 'immediate',
 * });
 *
 * if (result?.type === 'password') {
 *   // Handle password credential
 * } else if (result?.type === 'publicKey') {
 *   // Handle passkey credential
 * }
 * ```
 */
export class CredentialManager {
  /**
   * Request credentials using the unified Credential Manager API.
   *
   * With `mediation: 'immediate'`, only locally available credentials are returned.
   * No QR code or cross-device prompts are shown. If no credentials are found,
   * `null` is returned so you can fall back to your own login UI.
   *
   * @see https://github.com/nicklasb/webauthn/wiki/Explainer:-WebAuthn-immediate-mediation
   */
  async get(
    options: UnifiedCredentialRequestOptions,
  ): Promise<CredentialResult> {
    assertCredentialsAPI()

    const credentialOptions: CredentialRequestOptions = {
      mediation:
        (options.mediation as CredentialMediationRequirement) ?? 'optional',
      signal: options.signal,
    }

    // Password credentials
    if (options.password) {
      ;(credentialOptions as any).password = true
    }

    // PublicKey (Passkey) credentials
    if (options.publicKey) {
      credentialOptions.publicKey =
        options.publicKey as PublicKeyCredentialRequestOptions
    }

    // FedCM identity credentials
    if (options.identity) {
      ;(credentialOptions as any).identity = options.identity
    }

    // Digital credentials
    if (options.digital) {
      ;(credentialOptions as any).digital = options.digital
    }

    try {
      const credential = await navigator.credentials.get(credentialOptions)

      if (!credential) return null

      return this.classifyCredential(credential)
    } catch (error) {
      const wrapped = wrapError(error)

      // For immediate mediation, NOT_ALLOWED means "no credentials found"
      if (wrapped.code === 'NOT_ALLOWED' && options.mediation === 'immediate') {
        return null
      }

      throw wrapped
    }
  }

  /**
   * Store a credential (password) in the browser's credential manager.
   */
  async store(credential: Credential): Promise<void> {
    assertCredentialsAPI()
    try {
      await navigator.credentials.store(credential)
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Prevent automatic sign-in (e.g., after the user explicitly signs out).
   */
  async preventSilentAccess(): Promise<void> {
    assertCredentialsAPI()
    try {
      await navigator.credentials.preventSilentAccess()
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Create a PasswordCredential object for storing.
   */
  createPasswordCredential(
    id: string,
    password: string,
    name?: string,
    iconURL?: string,
  ): PasswordCredential {
    return new PasswordCredential({
      id,
      password,
      name: name ?? id,
      iconURL: iconURL ?? '',
    })
  }

  /**
   * Check if a given mediation type is supported.
   */
  static isMediationSupported(mediation: MediationType): boolean {
    // 'immediate' mediation is experimental (Chrome 136+)
    if (mediation === 'immediate') {
      // Feature detection: check if the browser doesn't throw on immediate
      return typeof navigator.credentials?.get === 'function'
    }
    return typeof navigator.credentials?.get === 'function'
  }

  private classifyCredential(credential: Credential): CredentialResult {
    if (credential instanceof PasswordCredential) {
      return { type: 'password', credential }
    }

    if (credential instanceof PublicKeyCredential) {
      return { type: 'publicKey', credential }
    }

    // FedCM returns an IdentityCredential (or FederatedCredential)
    if (credential.type === 'identity' || credential.type === 'federated') {
      return { type: 'federated', credential }
    }

    // Digital credentials
    if ((credential as any).type === 'digital') {
      return { type: 'digital', credential }
    }

    return null
  }
}

// Type augmentation for PasswordCredential (removed from recent lib.dom.d.ts)
declare global {
  interface PasswordCredentialData {
    id: string
    password: string
    name?: string
    iconURL?: string
  }

  interface PasswordCredential extends Credential {
    readonly password?: string
    readonly name?: string
    readonly iconURL?: string
  }

  var PasswordCredential: {
    prototype: PasswordCredential
    new (data: PasswordCredentialData): PasswordCredential
  }
}
