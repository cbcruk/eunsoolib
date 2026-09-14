/** How credential requests are surfaced to the user; see {@link UnifiedCredentialRequestOptions.mediation}. */
export type MediationType =
  | 'silent'
  | 'optional'
  | 'conditional'
  | 'required'
  | 'immediate'

/** Options for a single `navigator.credentials.get()` call that combines several credential types. */
export interface UnifiedCredentialRequestOptions {
  /**
   * Include stored passwords in the credential request.
   * @default false
   */
  password?: boolean

  /**
   * WebAuthn (passkey) request options.
   */
  publicKey?: PublicKeyCredentialRequestConfig

  /**
   * FedCM identity provider configurations.
   */
  identity?: IdentityCredentialRequestOptions

  /**
   * Digital credential request options.
   */
  digital?: DigitalCredentialRequestOptions

  /**
   * Controls how credentials are surfaced to the user.
   * - `'silent'`: No UI shown, only auto-sign-in.
   * - `'optional'`: Show UI if needed (default browser behavior).
   * - `'conditional'`: Passkeys via autofill (conditional UI).
   * - `'required'`: Always show account chooser.
   * - `'immediate'`: Only return locally available credentials; no QR code fallback.
   * @default 'optional'
   */
  mediation?: MediationType

  /**
   * AbortController signal to cancel the request.
   */
  signal?: AbortSignal
}

/**
 * WebAuthn authentication options passed as `publicKey` to `navigator.credentials.get()`.
 *
 * {@link Passkeys.authenticate} fills in `rpId`, `timeout` (300000), and
 * `userVerification` (`'preferred'`) when they are omitted;
 * {@link CredentialManager.get} passes the object through unchanged.
 */
export interface PublicKeyCredentialRequestConfig {
  /** Server-generated challenge the authenticator signs. */
  challenge: BufferSource
  /** Relying party ID (usually the site's domain). */
  rpId?: string
  /** Time in milliseconds the browser waits for the user. */
  timeout?: number
  /** Credentials allowed for this request; omit to allow any discoverable credential. */
  allowCredentials?: PublicKeyCredentialDescriptor[]
  /** Whether the authenticator must verify the user (e.g. biometrics or PIN). */
  userVerification?: UserVerificationRequirement
  /** WebAuthn client extension inputs. */
  extensions?: AuthenticationExtensionsClientInputs
}

/** Identifies a specific public key credential. */
export interface PublicKeyCredentialDescriptor {
  /** Credential type; always `'public-key'`. */
  type: 'public-key'
  /** Raw credential ID. */
  id: BufferSource
  /** Transports the authenticator is known to support, used as a hint. */
  transports?: AuthenticatorTransport[]
}

/** Options for registering a passkey with {@link Passkeys.create} or {@link Passkeys.conditionalCreate}. */
export interface PasskeyCreateOptions {
  /** Relying party the passkey is created for. */
  rp: RelyingPartyConfig
  /** User account the passkey belongs to. */
  user: UserConfig
  /** Server-generated challenge included in the attestation. */
  challenge: BufferSource
  /** Accepted public key algorithms in order of preference. Defaults to ES256 (`-7`) and RS256 (`-257`). */
  pubKeyCredParams?: PublicKeyCredentialParameters[]
  /**
   * Time in milliseconds the browser waits for the user.
   * {@link Passkeys.create} uses 300000 when omitted; {@link Passkeys.conditionalCreate}
   * (and `create` with `conditional: true`) leaves it to the browser default when omitted.
   */
  timeout?: number
  /**
   * Authenticator requirements. Defaults to a required discoverable credential
   * (`residentKey: 'required'`, `requireResidentKey: true`) with `userVerification: 'preferred'`.
   */
  authenticatorSelection?: AuthenticatorSelectionCriteria
  /** Attestation conveyance preference. @default 'none' */
  attestation?: AttestationConveyancePreference
  /** WebAuthn client extension inputs. */
  extensions?: AuthenticationExtensionsClientInputs
  /**
   * Make {@link Passkeys.create} request conditional creation (auto passkey
   * creation after password login, Chrome 136+) instead of showing the regular
   * registration UI.
   *
   * Unlike {@link Passkeys.conditionalCreate}, `create` throws instead of
   * resolving to `null`: `NOT_SUPPORTED` when conditional creation is
   * unavailable and `NOT_ALLOWED` when no passkey was created.
   * {@link Passkeys.conditionalCreate} ignores this option.
   * @default false
   */
  conditional?: boolean
}

/** Relying party (the website) information for passkey registration. */
export interface RelyingPartyConfig {
  /** Relying party ID (usually the site's domain). */
  id: string
  /** Human-readable relying party name. */
  name: string
}

/** User account information for passkey registration. */
export interface UserConfig {
  /** Opaque user handle; should not contain personal information. */
  id: BufferSource
  /** Account identifier such as a username or email. */
  name: string
  /** Human-readable name shown in the browser UI. */
  displayName: string
}

/** A public key algorithm accepted for passkey registration. */
export interface PublicKeyCredentialParameters {
  /** Credential type; always `'public-key'`. */
  type: 'public-key'
  /** COSE algorithm identifier (e.g. `-7` for ES256). */
  alg: COSEAlgorithmIdentifier
}

/** Numeric COSE algorithm identifier (e.g. `-7` for ES256, `-257` for RS256). */
export type COSEAlgorithmIdentifier = number

/** Requirements for the authenticator used during passkey registration. */
export interface AuthenticatorSelectionCriteria {
  /** Restrict to platform (built-in) or cross-platform (roaming) authenticators. */
  authenticatorAttachment?: AuthenticatorAttachment
  /** Whether a discoverable (resident) credential should be created. */
  residentKey?: ResidentKeyRequirement
  /** Legacy flag equivalent to `residentKey: 'required'`. */
  requireResidentKey?: boolean
  /** Whether the authenticator must verify the user. */
  userVerification?: UserVerificationRequirement
}

/** Authenticator attachment: built-in (`'platform'`) or roaming (`'cross-platform'`). */
export type AuthenticatorAttachment = 'platform' | 'cross-platform'
/** Requirement level for creating a discoverable credential. */
export type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required'
/** Requirement level for user verification by the authenticator. */
export type UserVerificationRequirement =
  | 'discouraged'
  | 'preferred'
  | 'required'
/** How much attestation information the relying party wants from the authenticator. */
export type AttestationConveyancePreference =
  | 'none'
  | 'indirect'
  | 'direct'
  | 'enterprise'
/** Transport an authenticator can communicate over. */
export type AuthenticatorTransport =
  | 'usb'
  | 'nfc'
  | 'ble'
  | 'internal'
  | 'hybrid'

// Signal API types
/** Options for {@link Passkeys.signalUnknownCredential}. */
export interface SignalOptions {
  /** Relying party ID the credential belongs to. */
  rpId: string
  /** ID of the credential the server no longer recognizes. */
  credentialId: BufferSource
}

/** Options for {@link Passkeys.signalAllAcceptedCredentials}. */
export interface SignalAllAcceptedCredentialsOptions {
  /** Relying party ID the credentials belong to. */
  rpId: string
  /** User handle whose credentials are being listed. */
  userId: BufferSource
  /** Every credential ID the server still accepts for this user. */
  allAcceptedCredentialIds: BufferSource[]
}

/**
 * Options for {@link Passkeys.signalAllAcceptedCredentials}.
 *
 * @deprecated Use {@link SignalAllAcceptedCredentialsOptions}, which matches the method name.
 */
export type SignalAllKnownCredentialsOptions =
  SignalAllAcceptedCredentialsOptions

/** FedCM prompt mode: `'active'` after a user gesture, `'passive'` shown automatically. */
export type FedCMMode = 'active' | 'passive'

/** FedCM options passed as `identity` to `navigator.credentials.get()`. */
export interface IdentityCredentialRequestOptions {
  /** Identity providers to offer. */
  providers: IdentityProviderConfig[]
  /**
   * Controls when the FedCM prompt appears.
   * - `'passive'`: Auto-shown on page load for returning users.
   * - `'active'`: Only shown after user interaction (e.g., button click).
   * @default 'passive'
   */
  mode?: FedCMMode
}

/** Configuration for a single FedCM identity provider. */
export interface IdentityProviderConfig {
  /** URL of the identity provider's FedCM config file. */
  configURL: string
  /** Client ID the relying party registered with the identity provider. */
  clientId: string
  /** Nonce the identity provider includes in the issued token. */
  nonce?: string
  /** Hint used to filter the accounts shown to the user. */
  loginHint?: string
  /** Hint used to filter accounts by domain. */
  domainHint?: string
}

/** Options for {@link FedCM.signIn}. */
export interface FedCMRequestOptions {
  /** Identity providers to offer. */
  providers: IdentityProviderConfig[]
  /** FedCM prompt mode; left to the browser when omitted. */
  mode?: FedCMMode
  /** Mediation requirement for the request. @default 'optional' */
  mediation?: MediationType
  /** Signal to abort the request. */
  signal?: AbortSignal
}

/** Digital credential options passed as `digital` to `navigator.credentials.get()`. */
export interface DigitalCredentialRequestOptions {
  /** Credential requests to offer to the user's wallet. */
  providers: DigitalCredentialProvider[]
}

/** A digital credential request for a specific presentation protocol. */
export interface DigitalCredentialProvider {
  /** Presentation protocol identifier (e.g. `'openid4vp'`). */
  protocol: string
  /** Protocol-specific request payload. */
  request: DigitalCredentialProtocolRequest
}

/** Request payload describing which credential and fields to present. */
export interface DigitalCredentialProtocolRequest {
  /**
   * Selector for the type of credential requested.
   */
  selector: DigitalCredentialSelector
  /**
   * Nonce for freshness/replay protection.
   */
  nonce?: string
  /**
   * Reader authentication data.
   */
  readerAuth?: unknown
}

/** Selects the credential format, document type, and fields to request. */
export interface DigitalCredentialSelector {
  /** Credential format (e.g. `'mdoc'` or `'vc'`). */
  format: string
  /** Document type for mdoc credentials (e.g. `'org.iso.18013.5.1.mDL'`). */
  doctype?: string
  /** Fields to disclose. */
  fields: DigitalCredentialField[]
}

/** A single credential field to request. */
export interface DigitalCredentialField {
  /** Namespace the field belongs to (e.g. `'org.iso.18013.5.1'`). */
  namespace: string
  /** Field name within the namespace (e.g. `'age_over_18'`). */
  name: string
  /** Whether the verifier intends to store the field value. */
  intentToRetain?: boolean
}

/** Request for issuing a digital credential with {@link DigitalCredentials.issue}. */
export interface DigitalCredentialCreateRequest {
  /** Issuance protocol identifier. */
  protocol: string
  /** Protocol-specific issuance payload. */
  data: unknown
}

/** Server endpoints used to build DBSC registration headers. */
export interface DBSCRegistrationConfig {
  /** Endpoint that handles DBSC registration on your server. */
  registrationEndpoint: string
  /** Endpoint for session refresh using device-bound keys. */
  refreshEndpoint?: string
}

/**
 * Credential returned by {@link CredentialManager.get}, tagged by kind.
 *
 * `null` when no credential was returned, when an `'immediate'` request found
 * none, or when the credential could not be classified.
 */
export type CredentialResult =
  | { type: 'password'; credential: PasswordCredential }
  | { type: 'publicKey'; credential: PublicKeyCredential }
  | { type: 'federated'; credential: Credential }
  | { type: 'digital'; credential: Credential }
  | null

/**
 * Result of {@link WebIdentity.detectFeatures}.
 *
 * Every flag is `false` when the browser gives no signal that confirms support,
 * so a `true` value is safe to branch UI on.
 */
export interface FeatureSupport {
  /** `navigator.credentials.get` is available. */
  credentialManager: boolean
  /** WebAuthn is available in a secure context. */
  webauthn: boolean
  /** Passkey autofill (conditional mediation) is available. */
  conditionalMediation: boolean
  /** Immediate mediation is available, per the `immediateGet` client capability. */
  immediateMediation: boolean
  /** Conditional passkey creation is available, per the `conditionalCreate` client capability. */
  passkeyConditionalCreate: boolean
  /** The WebAuthn Signal API (`signalUnknownCredential`) is available. */
  signalAPI: boolean
  /** FedCM (`IdentityCredential`) is available. */
  fedcm: boolean
  /** FedCM active mode is available, i.e. the browser reads the `identity.mode` option. */
  fedcmActiveMode: boolean
  /** The Digital Credentials API is available. */
  digitalCredentials: boolean
}

/** Error thrown by this library, normalizing native credential errors into a {@link WebIdentityErrorCode}. */
export class WebIdentityError extends Error {
  /** Normalized error category. */
  public readonly code: WebIdentityErrorCode
  /** Original error that was wrapped, if any. */
  public readonly cause?: unknown

  /**
   * @param code - Normalized error category.
   * @param message - Human-readable error message.
   * @param cause - Original error being wrapped.
   */
  constructor(code: WebIdentityErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'WebIdentityError'
    this.code = code
    this.cause = cause
  }
}

/**
 * Error category for {@link WebIdentityError}.
 *
 * Native `DOMException` names map to codes (e.g. `NotAllowedError` becomes
 * `'NOT_ALLOWED'`); anything else becomes `'UNKNOWN'`.
 */
export type WebIdentityErrorCode =
  | 'NOT_SUPPORTED'
  | 'NOT_ALLOWED'
  | 'ABORTED'
  | 'INVALID_STATE'
  | 'SECURITY_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'
