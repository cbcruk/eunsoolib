export type MediationType =
  | 'silent'
  | 'optional'
  | 'conditional'
  | 'required'
  | 'immediate'

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

export interface PublicKeyCredentialRequestConfig {
  challenge: BufferSource
  rpId?: string
  timeout?: number
  allowCredentials?: PublicKeyCredentialDescriptor[]
  userVerification?: UserVerificationRequirement
  extensions?: AuthenticationExtensionsClientInputs
}

export interface PublicKeyCredentialDescriptor {
  type: 'public-key'
  id: BufferSource
  transports?: AuthenticatorTransport[]
}

export interface PasskeyCreateOptions {
  rp: RelyingPartyConfig
  user: UserConfig
  challenge: BufferSource
  pubKeyCredParams?: PublicKeyCredentialParameters[]
  timeout?: number
  authenticatorSelection?: AuthenticatorSelectionCriteria
  attestation?: AttestationConveyancePreference
  extensions?: AuthenticationExtensionsClientInputs
  /**
   * If true, use conditional creation (auto passkey creation after password login).
   * Available from Chrome 136+.
   * @default false
   */
  conditional?: boolean
}

export interface RelyingPartyConfig {
  id: string
  name: string
}

export interface UserConfig {
  id: BufferSource
  name: string
  displayName: string
}

export interface PublicKeyCredentialParameters {
  type: 'public-key'
  alg: COSEAlgorithmIdentifier
}

export type COSEAlgorithmIdentifier = number

export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment
  residentKey?: ResidentKeyRequirement
  requireResidentKey?: boolean
  userVerification?: UserVerificationRequirement
}

export type AuthenticatorAttachment = 'platform' | 'cross-platform'
export type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required'
export type UserVerificationRequirement =
  | 'discouraged'
  | 'preferred'
  | 'required'
export type AttestationConveyancePreference =
  | 'none'
  | 'indirect'
  | 'direct'
  | 'enterprise'
export type AuthenticatorTransport =
  | 'usb'
  | 'nfc'
  | 'ble'
  | 'internal'
  | 'hybrid'

// Signal API types
export interface SignalOptions {
  rpId: string
  credentialId: BufferSource
}

export interface SignalAllKnownCredentialsOptions {
  rpId: string
  userId: BufferSource
  allAcceptedCredentialIds: BufferSource[]
}

export type FedCMMode = 'active' | 'passive'

export interface IdentityCredentialRequestOptions {
  providers: IdentityProviderConfig[]
  /**
   * Controls when the FedCM prompt appears.
   * - `'passive'`: Auto-shown on page load for returning users.
   * - `'active'`: Only shown after user interaction (e.g., button click).
   * @default 'passive'
   */
  mode?: FedCMMode
}

export interface IdentityProviderConfig {
  configURL: string
  clientId: string
  nonce?: string
  loginHint?: string
  domainHint?: string
}

export interface FedCMRequestOptions {
  providers: IdentityProviderConfig[]
  mode?: FedCMMode
  mediation?: MediationType
  signal?: AbortSignal
}

export interface DigitalCredentialRequestOptions {
  providers: DigitalCredentialProvider[]
}

export interface DigitalCredentialProvider {
  protocol: string
  request: DigitalCredentialProtocolRequest
}

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

export interface DigitalCredentialSelector {
  format: string
  doctype?: string
  fields: DigitalCredentialField[]
}

export interface DigitalCredentialField {
  namespace: string
  name: string
  intentToRetain?: boolean
}

export interface DigitalCredentialCreateRequest {
  protocol: string
  data: unknown
}

export interface DBSCRegistrationConfig {
  /** Endpoint that handles DBSC registration on your server. */
  registrationEndpoint: string
  /** Endpoint for session refresh using device-bound keys. */
  refreshEndpoint?: string
}

export type CredentialResult =
  | { type: 'password'; credential: PasswordCredential }
  | { type: 'publicKey'; credential: PublicKeyCredential }
  | { type: 'federated'; credential: Credential }
  | { type: 'digital'; credential: Credential }
  | null

export interface FeatureSupport {
  credentialManager: boolean
  webauthn: boolean
  conditionalMediation: boolean
  immediateMediation: boolean
  passkeyConditionalCreate: boolean
  signalAPI: boolean
  fedcm: boolean
  fedcmActiveMode: boolean
  digitalCredentials: boolean
}

export class WebIdentityError extends Error {
  public readonly code: WebIdentityErrorCode
  public readonly cause?: unknown

  constructor(code: WebIdentityErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'WebIdentityError'
    this.code = code
    this.cause = cause
  }
}

export type WebIdentityErrorCode =
  | 'NOT_SUPPORTED'
  | 'NOT_ALLOWED'
  | 'ABORTED'
  | 'INVALID_STATE'
  | 'SECURITY_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'
