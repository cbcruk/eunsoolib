import type {
  FedCMRequestOptions,
  IdentityProviderConfig,
  FedCMMode,
} from './types'
import { WebIdentityError } from './types'
import { assertCredentialsAPI, wrapError } from './utils'

/**
 * Federated Credential Management (FedCM) API wrapper.
 *
 * Enables browser-mediated federated sign-in with privacy-preserving flows.
 * Supports both active mode (user-triggered) and passive mode (auto-prompted).
 *
 * @example
 * ```ts
 * const fedcm = new FedCM();
 *
 * // Active mode: show sign-in prompt after user clicks a button
 * const credential = await fedcm.signIn({
 *   providers: [{
 *     configURL: 'https://idp.example.com/.well-known/fedcm.json',
 *     clientId: 'your-client-id',
 *   }],
 *   mode: 'active',
 * });
 *
 * // Multi-provider: let user choose between Google, GitHub, etc.
 * const credential = await fedcm.signIn({
 *   providers: [googleProvider, githubProvider],
 *   mode: 'active',
 * });
 * ```
 */
export class FedCM {
  /**
   * Request federated sign-in using FedCM.
   *
   * @param options - FedCM request options including providers and mode.
   * @returns The identity credential, or null if dismissed.
   */
  async signIn(options: FedCMRequestOptions): Promise<Credential | null> {
    assertCredentialsAPI()

    if (!FedCM.isSupported()) {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'FedCM is not supported in this browser.',
      )
    }

    const requestOptions: CredentialRequestOptions = {
      mediation: (options.mediation ??
        'optional') as CredentialMediationRequirement,
      signal: options.signal,
    }

    // Build identity options
    const identity: any = {
      providers: options.providers.map((p) => ({
        configURL: p.configURL,
        clientId: p.clientId,
        nonce: p.nonce,
        loginHint: p.loginHint,
        domainHint: p.domainHint,
      })),
    }

    if (options.mode) {
      identity.mode = options.mode
    }

    ;(requestOptions as any).identity = identity

    try {
      const credential = await navigator.credentials.get(requestOptions)
      return credential
    } catch (error) {
      const wrapped = wrapError(error)
      // User dismissed the prompt
      if (wrapped.code === 'ABORTED' || wrapped.code === 'NOT_ALLOWED') {
        return null
      }
      throw wrapped
    }
  }

  /**
   * Active-mode sign-in — only show the FedCM prompt after a user gesture
   * (e.g., clicking a "Sign in with..." button).
   *
   * Available from Chrome 132+.
   */
  async signInActive(
    providers: IdentityProviderConfig[],
    signal?: AbortSignal,
  ): Promise<Credential | null> {
    return this.signIn({
      providers,
      mode: 'active',
      mediation: 'optional',
      signal,
    })
  }

  /**
   * Passive-mode sign-in — automatically prompt returning users.
   * Best used on page load for users who have previously signed in.
   */
  async signInPassive(
    providers: IdentityProviderConfig[],
    signal?: AbortSignal,
  ): Promise<Credential | null> {
    return this.signIn({
      providers,
      mode: 'passive',
      mediation: 'optional',
      signal,
    })
  }

  /**
   * Multi-provider sign-in — present multiple IdPs to the user at once.
   *
   * Available from Chrome 136+.
   *
   * @see https://privacysandbox.google.com/blog/fedcm-chrome-136-updates
   */
  async signInMultiProvider(
    providers: IdentityProviderConfig[],
    opts?: { mode?: FedCMMode; signal?: AbortSignal },
  ): Promise<Credential | null> {
    if (providers.length < 2) {
      throw new WebIdentityError(
        'INVALID_STATE',
        'Multi-provider sign-in requires at least 2 providers.',
      )
    }

    return this.signIn({
      providers,
      mode: opts?.mode ?? 'active',
      signal: opts?.signal,
    })
  }

  /**
   * Disconnect from an identity provider.
   * This revokes the FedCM connection between the RP and IdP.
   */
  async disconnect(
    configURL: string,
    clientId: string,
    accountHint: string,
  ): Promise<void> {
    if (!(IdentityCredential as any)?.disconnect) {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'FedCM disconnect is not supported.',
      )
    }

    try {
      await (IdentityCredential as any).disconnect({
        configURL,
        clientId,
        accountHint,
      })
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Check if FedCM is supported.
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'IdentityCredential' in window
  }

  /**
   * Check if FedCM active mode is supported (Chrome 132+).
   */
  static isActiveModeSupported(): boolean {
    // Active mode is supported if FedCM is supported and the mode option is accepted.
    return FedCM.isSupported()
  }

  /**
   * Create a provider configuration object.
   */
  static provider(
    configURL: string,
    clientId: string,
    opts?: { nonce?: string; loginHint?: string; domainHint?: string },
  ): IdentityProviderConfig {
    return {
      configURL,
      clientId,
      ...opts,
    }
  }
}

// Type augmentation for IdentityCredential (not yet in lib.dom.d.ts)
declare global {
  interface IdentityCredential extends Credential {
    readonly token: string
  }
  var IdentityCredential: {
    prototype: IdentityCredential
    new (): IdentityCredential
    disconnect?(options: {
      configURL: string
      clientId: string
      accountHint: string
    }): Promise<void>
  }
}
