import type {
  PasskeyCreateOptions,
  SignalOptions,
  SignalAllAcceptedCredentialsOptions,
  PublicKeyCredentialRequestConfig,
  MediationType,
} from './types'
import { WebIdentityError } from './types'
import {
  assertCredentialsAPI,
  wrapError,
  toBase64URL,
  getClientCapabilities,
} from './utils'

const DEFAULT_PUB_KEY_CRED_PARAMS: PublicKeyCredentialParameters[] = [
  { type: 'public-key', alg: -7 }, // ES256
  { type: 'public-key', alg: -257 }, // RS256
]

function buildCreationOptions(
  options: PasskeyCreateOptions,
  timeout: number | undefined,
): PublicKeyCredentialCreationOptions {
  return {
    rp: options.rp,
    user: {
      id: options.user.id,
      name: options.user.name,
      displayName: options.user.displayName,
    },
    challenge: options.challenge,
    pubKeyCredParams: options.pubKeyCredParams ?? DEFAULT_PUB_KEY_CRED_PARAMS,
    timeout,
    authenticatorSelection: options.authenticatorSelection ?? {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'preferred',
    },
    attestation: options.attestation ?? 'none',
    extensions: options.extensions,
  }
}

/**
 * Passkey (WebAuthn) utilities for registration, authentication, Signal API,
 * and conditional (auto) passkey creation.
 *
 * @example
 * ```ts
 * import { Passkeys } from '@cbcruk/web-identity';
 *
 * const passkeys = new Passkeys('example.com');
 *
 * // Register a new passkey
 * const credential = await passkeys.create({
 *   rp: { id: 'example.com', name: 'Example' },
 *   user: { id: userId, name: 'alice', displayName: 'Alice' },
 *   challenge: serverChallenge,
 * });
 *
 * // Authenticate with immediate mediation (no QR code fallback)
 * const assertion = await passkeys.authenticate({
 *   challenge: serverChallenge,
 * }, { mediation: 'immediate' });
 *
 * // Auto-create passkey after password login (Chrome 136+)
 * await passkeys.conditionalCreate({ ... });
 *
 * // Signal API: notify password manager that a passkey was deleted
 * await passkeys.signalUnknownCredential({ rpId: 'example.com', credentialId });
 * ```
 */
export class Passkeys {
  private rpId: string

  /**
   * @param rpId - Relying party ID used by {@link Passkeys.authenticate} when `config.rpId` is omitted.
   */
  constructor(rpId: string) {
    this.rpId = rpId
  }

  /**
   * Create (register) a new passkey.
   *
   * With `options.conditional: true`, conditional creation is requested instead
   * of the regular registration UI (see {@link Passkeys.conditionalCreate}).
   *
   * @param options - Passkey creation options.
   * @returns The PublicKeyCredential from the authenticator.
   * @throws {@link WebIdentityError} `NOT_ALLOWED` when creation is cancelled or no
   * passkey was created, `NOT_SUPPORTED` when `conditional: true` is passed but
   * conditional creation is unavailable, or the wrapped native error otherwise.
   */
  async create(options: PasskeyCreateOptions): Promise<PublicKeyCredential> {
    assertCredentialsAPI()

    if (options.conditional) {
      if (!(await Passkeys.isConditionalCreateAvailable())) {
        throw new WebIdentityError(
          'NOT_SUPPORTED',
          'Conditional passkey creation is not supported.',
        )
      }
      const credential = await this.requestConditionalCreate(options)
      if (!credential) {
        throw new WebIdentityError(
          'NOT_ALLOWED',
          'Conditional passkey creation did not create a passkey.',
        )
      }
      return credential
    }

    const publicKey = buildCreationOptions(options, options.timeout ?? 300_000)

    try {
      const credential = await navigator.credentials.create({ publicKey })
      if (!credential) {
        throw new WebIdentityError(
          'NOT_ALLOWED',
          'Passkey creation was cancelled or not allowed.',
        )
      }
      return credential as PublicKeyCredential
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Conditionally create a passkey without user interaction.
   *
   * After a successful password login, call this to silently upgrade the user
   * to a passkey. If the browser/password manager supports it, the passkey is
   * created in the background without interrupting the user.
   *
   * Support is checked with {@link Passkeys.isConditionalCreateAvailable} first,
   * so browsers that would fall back to the regular registration UI are skipped.
   * `options.timeout` is passed through (browser default when omitted), and
   * `options.conditional` is ignored.
   *
   * Available from Chrome 136+.
   *
   * @returns The created credential, or `null` when conditional creation is
   * unavailable or the browser declined (`NotAllowedError`).
   * @throws {@link WebIdentityError} for any other failure, such as
   * `INVALID_STATE` when a listed credential already exists or `SECURITY_ERROR`
   * for an invalid relying party ID.
   * @see https://developer.chrome.com/docs/identity/webauthn-conditional-create
   */
  async conditionalCreate(
    options: PasskeyCreateOptions,
  ): Promise<PublicKeyCredential | null> {
    assertCredentialsAPI()

    if (!(await Passkeys.isConditionalCreateAvailable())) {
      return null
    }

    try {
      return await this.requestConditionalCreate(options)
    } catch (error) {
      const wrapped = wrapError(error)
      if (wrapped.code === 'NOT_ALLOWED') {
        return null
      }
      throw wrapped
    }
  }

  private async requestConditionalCreate(
    options: PasskeyCreateOptions,
  ): Promise<PublicKeyCredential | null> {
    const publicKey = buildCreationOptions(options, options.timeout)

    try {
      const credential = await navigator.credentials.create({
        publicKey,
        // @ts-expect-error -- conditional create is experimental
        mediation: 'conditional',
      })
      return credential as PublicKeyCredential | null
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Authenticate with a passkey.
   *
   * @param config - PublicKey request configuration.
   * @param opts - Additional options like mediation and abort signal.
   *
   * With `mediation: 'immediate'`, only locally available passkeys are used.
   * Returns `null` if no passkey is found on this device (no QR code shown).
   */
  async authenticate(
    config: Partial<PublicKeyCredentialRequestConfig> & {
      challenge: BufferSource
    },
    opts?: { mediation?: MediationType; signal?: AbortSignal },
  ): Promise<PublicKeyCredential | null> {
    assertCredentialsAPI()

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: config.challenge,
      rpId: config.rpId ?? this.rpId,
      timeout: config.timeout ?? 300_000,
      allowCredentials: config.allowCredentials as any,
      userVerification: config.userVerification ?? 'preferred',
      extensions: config.extensions,
    }

    const mediation = opts?.mediation ?? 'optional'

    try {
      const credential = await navigator.credentials.get({
        publicKey,
        mediation: mediation as CredentialMediationRequirement,
        signal: opts?.signal,
      })

      return credential as PublicKeyCredential | null
    } catch (error) {
      const wrapped = wrapError(error)
      if (wrapped.code === 'NOT_ALLOWED' && mediation === 'immediate') {
        return null // No credential on this device
      }
      throw wrapped
    }
  }

  /**
   * Authenticate via autofill (conditional UI).
   * Triggers passkey suggestions in the browser's autofill dropdown.
   *
   * @see https://web.dev/articles/passkey-form-autofill
   */
  async authenticateConditional(
    config: Partial<PublicKeyCredentialRequestConfig> & {
      challenge: BufferSource
    },
    signal?: AbortSignal,
  ): Promise<PublicKeyCredential | null> {
    return this.authenticate(config, { mediation: 'conditional', signal })
  }

  /**
   * Signal to the password manager that a passkey credential has been removed
   * server-side, so the password manager can clean up its local copy.
   *
   * @see https://developer.chrome.com/docs/identity/webauthn-signal-api
   */
  async signalUnknownCredential(options: SignalOptions): Promise<void> {
    assertCredentialsAPI()

    const pkCred = PublicKeyCredential as any
    if (typeof pkCred.signalUnknownCredential !== 'function') {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'Signal API (signalUnknownCredential) is not supported.',
      )
    }

    try {
      await pkCred.signalUnknownCredential({
        rpId: options.rpId,
        credentialId: options.credentialId,
      })
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Signal the complete list of known credential IDs for a user.
   * The password manager will remove any passkeys not in this list.
   *
   * @see https://developer.chrome.com/docs/identity/webauthn-signal-api
   */
  async signalAllAcceptedCredentials(
    options: SignalAllAcceptedCredentialsOptions,
  ): Promise<void> {
    assertCredentialsAPI()

    const pkCred = PublicKeyCredential as any
    if (typeof pkCred.signalAllAcceptedCredentials !== 'function') {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'Signal API (signalAllAcceptedCredentials) is not supported.',
      )
    }

    try {
      await pkCred.signalAllAcceptedCredentials({
        rpId: options.rpId,
        userId: options.userId,
        allAcceptedCredentialIds: options.allAcceptedCredentialIds,
      })
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Signal an updated username/displayName for a credential.
   */
  async signalCurrentUserDetails(
    rpId: string,
    userId: BufferSource,
    name: string,
    displayName: string,
  ): Promise<void> {
    assertCredentialsAPI()

    const pkCred = PublicKeyCredential as any
    if (typeof pkCred.signalCurrentUserDetails !== 'function') {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'Signal API (signalCurrentUserDetails) is not supported.',
      )
    }

    try {
      await pkCred.signalCurrentUserDetails({
        rpId,
        userId,
        name,
        displayName,
      })
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Check if WebAuthn is supported.
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined'
    )
  }

  /**
   * Check if conditional mediation (autofill UI) is supported.
   */
  static async isConditionalMediationSupported(): Promise<boolean> {
    if (!Passkeys.isSupported()) return false
    try {
      const pkc = PublicKeyCredential as any
      if (typeof pkc.isConditionalMediationAvailable === 'function') {
        return await pkc.isConditionalMediationAvailable()
      }
    } catch {}
    return false
  }

  /**
   * Synchronously check if conditional (auto) passkey creation is supported.
   *
   * Browsers expose this capability only through the asynchronous
   * `PublicKeyCredential.getClientCapabilities()`, so there is no synchronous
   * signal and this always returns `false` rather than guessing.
   *
   * @deprecated Use {@link Passkeys.isConditionalCreateAvailable}, which reads the
   * `conditionalCreate` client capability.
   */
  isConditionalCreateSupported(): boolean {
    return false
  }

  /**
   * Check if conditional (auto) passkey creation is available, using the
   * `conditionalCreate` client capability.
   *
   * @returns `false` when WebAuthn or `getClientCapabilities()` is unavailable,
   * or when the capability is not reported as `true`.
   */
  static async isConditionalCreateAvailable(): Promise<boolean> {
    const capabilities = await getClientCapabilities()
    return capabilities.conditionalCreate === true
  }

  /**
   * Check if immediate mediation (`mediation: 'immediate'`) is available for
   * passkey requests, using the `immediateGet` client capability.
   *
   * @returns `false` when WebAuthn or `getClientCapabilities()` is unavailable,
   * or when the capability is not reported as `true`.
   * @see https://developer.chrome.com/blog/webauthn-immediate-mediation-ot
   */
  static async isImmediateMediationAvailable(): Promise<boolean> {
    const capabilities = await getClientCapabilities()
    return capabilities.immediateGet === true
  }

  /**
   * Check if Signal API is supported.
   */
  static isSignalAPISupported(): boolean {
    if (!Passkeys.isSupported()) return false
    const pkc = PublicKeyCredential as any
    return typeof pkc.signalUnknownCredential === 'function'
  }

  /**
   * Extract the authenticator response from a PublicKeyCredential for server verification.
   */
  static serialize(credential: PublicKeyCredential): Record<string, unknown> {
    const response = credential.response

    const result: Record<string, unknown> = {
      id: credential.id,
      rawId: toBase64URL(credential.rawId),
      type: credential.type,
    }

    if ('attestationObject' in response) {
      // Registration response
      const attestation = response as AuthenticatorAttestationResponse
      result.response = {
        clientDataJSON: toBase64URL(attestation.clientDataJSON),
        attestationObject: toBase64URL(attestation.attestationObject),
      }
      if (typeof attestation.getTransports === 'function') {
        ;(result.response as any).transports = attestation.getTransports()
      }
      if (typeof attestation.getPublicKey === 'function') {
        const pk = attestation.getPublicKey()
        if (pk) (result.response as any).publicKey = toBase64URL(pk)
      }
      if (typeof attestation.getPublicKeyAlgorithm === 'function') {
        ;(result.response as any).publicKeyAlgorithm =
          attestation.getPublicKeyAlgorithm()
      }
    } else {
      // Authentication response
      const assertion = response as AuthenticatorAssertionResponse
      result.response = {
        clientDataJSON: toBase64URL(assertion.clientDataJSON),
        authenticatorData: toBase64URL(assertion.authenticatorData),
        signature: toBase64URL(assertion.signature),
        userHandle: assertion.userHandle
          ? toBase64URL(assertion.userHandle)
          : null,
      }
    }

    if (typeof credential.getClientExtensionResults === 'function') {
      result.clientExtensionResults = credential.getClientExtensionResults()
    }

    return result
  }

  /**
   * Generate a cryptographic challenge for WebAuthn operations.
   * In production, always generate challenges server-side.
   */
  static generateChallenge(length = 32): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length))
  }
}
