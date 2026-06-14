import { CredentialManager } from './credential-manager'
import { Passkeys } from './passkeys'
import { FedCM } from './fedcm'
import { DigitalCredentials } from './digital-credentials'
import { DBSC } from './dbsc'
import type {
  FeatureSupport,
  UnifiedCredentialRequestOptions,
  CredentialResult,
  PasskeyCreateOptions,
  IdentityProviderConfig,
  DigitalCredentialProvider,
} from './types'

/**
 * `WebIdentity` — unified facade for all modern Web Identity APIs.
 *
 * Provides a single entry point for passwords, passkeys, FedCM,
 * digital credentials, and device-bound sessions.
 *
 * @example
 * ```ts
 * import { WebIdentity } from 'web-identity';
 *
 * const identity = new WebIdentity('example.com');
 *
 * // 1. Check what's supported
 * const support = await identity.detectFeatures();
 * console.log(support);
 *
 * // 2. Unified sign-in (password + passkey + FedCM)
 * const result = await identity.signIn({
 *   password: true,
 *   publicKey: { challenge, rpId: 'example.com' },
 *   identity: {
 *     providers: [{ configURL: 'https://idp.example/.well-known/fedcm.json', clientId: 'abc' }],
 *     mode: 'active',
 *   },
 *   mediation: 'immediate',
 * });
 *
 * // 3. Register a passkey
 * const passkey = await identity.passkeys.create({ ... });
 *
 * // 4. Auto-upgrade to passkey after password login
 * await identity.passkeys.conditionalCreate({ ... });
 *
 * // 5. Request age verification from digital wallet
 * const cred = await identity.digitalCredentials.request([
 *   DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
 *     DigitalCredentials.Fields.ageOver18,
 *   ]),
 * ]);
 * ```
 */
export class WebIdentity {
  public readonly credentialManager: CredentialManager
  public readonly passkeys: Passkeys
  public readonly fedcm: FedCM
  public readonly digitalCredentials: DigitalCredentials
  public readonly rpId: string

  constructor(rpId: string) {
    this.rpId = rpId
    this.credentialManager = new CredentialManager()
    this.passkeys = new Passkeys(rpId)
    this.fedcm = new FedCM()
    this.digitalCredentials = new DigitalCredentials()
  }

  /**
   * Unified sign-in: request any combination of passwords, passkeys,
   * and federated credentials in a single call.
   *
   * With `mediation: 'immediate'`, only locally available credentials
   * are returned. No QR codes or cross-device prompts are shown.
   */
  async signIn(
    options: UnifiedCredentialRequestOptions,
  ): Promise<CredentialResult> {
    return this.credentialManager.get(options)
  }

  /**
   * Quick passkey-only sign-in with immediate mediation.
   * Returns null if no passkey is available on this device.
   */
  async signInWithPasskey(
    challenge: BufferSource,
    opts?: { signal?: AbortSignal },
  ): Promise<PublicKeyCredential | null> {
    return this.passkeys.authenticate(
      { challenge, rpId: this.rpId },
      { mediation: 'immediate', signal: opts?.signal },
    )
  }

  /**
   * Quick FedCM sign-in with active mode.
   */
  async signInWithFederation(
    providers: IdentityProviderConfig[],
    opts?: { signal?: AbortSignal },
  ): Promise<Credential | null> {
    return this.fedcm.signInActive(providers, opts?.signal)
  }

  /**
   * Quick password + passkey unified sign-in.
   * Combines both credential types in a single browser prompt.
   */
  async signInPasswordOrPasskey(
    challenge: BufferSource,
    opts?: { mediation?: 'optional' | 'immediate'; signal?: AbortSignal },
  ): Promise<CredentialResult> {
    return this.credentialManager.get({
      password: true,
      publicKey: { challenge, rpId: this.rpId },
      mediation: opts?.mediation ?? 'immediate',
      signal: opts?.signal,
    })
  }

  /**
   * Register a new passkey for the user.
   */
  async registerPasskey(
    options: PasskeyCreateOptions,
  ): Promise<PublicKeyCredential> {
    return this.passkeys.create(options)
  }

  /**
   * Silently upgrade a password user to passkey (Chrome 136+).
   * Call this after a successful password login.
   */
  async upgradeToPasskey(
    options: PasskeyCreateOptions,
  ): Promise<PublicKeyCredential | null> {
    return this.passkeys.conditionalCreate(options)
  }

  /**
   * Request verified identity attributes from the user's digital wallet.
   */
  async verifyIdentity(
    providers: DigitalCredentialProvider[],
    signal?: AbortSignal,
  ): Promise<Credential | null> {
    return this.digitalCredentials.request(providers, signal)
  }

  /**
   * Sign out: prevent silent/automatic credential access.
   */
  async signOut(): Promise<void> {
    await this.credentialManager.preventSilentAccess()
  }

  /**
   * Detect which Web Identity features are available in the current browser.
   */
  async detectFeatures(): Promise<FeatureSupport> {
    const conditionalMediation =
      await Passkeys.isConditionalMediationSupported()

    return {
      credentialManager: typeof navigator.credentials?.get === 'function',
      webauthn: Passkeys.isSupported(),
      conditionalMediation,
      immediateMediation: Passkeys.isSupported(), // Requires Chrome 136+ flag
      passkeyConditionalCreate: Passkeys.isSupported(), // Chrome 136+
      signalAPI: Passkeys.isSignalAPISupported(),
      fedcm: FedCM.isSupported(),
      fedcmActiveMode: FedCM.isActiveModeSupported(),
      digitalCredentials: DigitalCredentials.isSupported(),
    }
  }
}
