import type {
  DigitalCredentialProvider,
  DigitalCredentialField,
  DigitalCredentialCreateRequest,
} from './types'
import { WebIdentityError } from './types'
import { assertCredentialsAPI, wrapError } from './utils'

/**
 * Digital Credentials API wrapper for requesting and issuing verified identity
 * attributes from mobile wallets (e.g., age verification, driver's license).
 *
 * @example
 * ```ts
 * const dc = new DigitalCredentials();
 *
 * // Request age verification (selective disclosure)
 * const credential = await dc.request([
 *   DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
 *     { namespace: 'org.iso.18013.5.1', name: 'age_over_18' },
 *   ]),
 * ]);
 *
 * // Request multiple fields
 * const credential = await dc.request([
 *   DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
 *     { namespace: 'org.iso.18013.5.1', name: 'given_name' },
 *     { namespace: 'org.iso.18013.5.1', name: 'family_name' },
 *     { namespace: 'org.iso.18013.5.1', name: 'portrait' },
 *   ]),
 * ]);
 * ```
 *
 * @see https://developer.chrome.com/blog/digital-credentials-api-origin-trial
 */
export class DigitalCredentials {
  /**
   * Request digital credentials from the user's wallet.
   *
   * The browser shows a system UI asking the user to select a credential
   * from their mobile wallet. Only the requested fields are shared
   * (selective disclosure).
   *
   * @param providers - Array of credential providers/requests.
   * @param signal - Optional AbortSignal to cancel the request.
   * @returns The digital credential response, or null if dismissed.
   */
  async request(
    providers: DigitalCredentialProvider[],
    signal?: AbortSignal,
  ): Promise<Credential | null> {
    assertCredentialsAPI()

    if (!DigitalCredentials.isSupported()) {
      throw new WebIdentityError(
        'NOT_SUPPORTED',
        'Digital Credentials API is not supported in this browser.',
      )
    }

    const options: CredentialRequestOptions = {
      signal,
    }

    ;(options as any).digital = { providers }

    try {
      const credential = await navigator.credentials.get(options)
      return credential
    } catch (error) {
      const wrapped = wrapError(error)
      if (wrapped.code === 'ABORTED' || wrapped.code === 'NOT_ALLOWED') {
        return null
      }
      throw wrapped
    }
  }

  /**
   * Issue (provision) a digital credential to the user's wallet.
   *
   * This is an upcoming extension of the Digital Credentials API.
   *
   * @see https://w3c-fedid.github.io/digital-credentials/#the-digitalcredentialcreaterequest-dictionary
   */
  async issue(
    request: DigitalCredentialCreateRequest,
  ): Promise<Credential | null> {
    assertCredentialsAPI()

    const options: CredentialCreationOptions = {}
    ;(options as any).digital = request

    try {
      const credential = await navigator.credentials.create(options)
      return credential
    } catch (error) {
      throw wrapError(error)
    }
  }

  /**
   * Check if the Digital Credentials API is supported.
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    // The API is exposed via navigator.credentials.get() with a `digital` option.
    // Feature detection relies on the presence of the DigitalCredential interface.
    return 'DigitalCredential' in window || 'identity' in (navigator as any)
  }

  /**
   * Create an mDL (mobile driver's license) provider configuration
   * using the ISO 18013-5 mdoc format.
   */
  static mdocProvider(
    doctype: string,
    fields: DigitalCredentialField[],
    nonce?: string,
  ): DigitalCredentialProvider {
    return {
      protocol: 'openid4vp',
      request: {
        selector: {
          format: 'mdoc',
          doctype,
          fields,
        },
        nonce,
      },
    }
  }

  /**
   * Create a W3C Verifiable Credential provider configuration.
   */
  static vcProvider(
    fields: DigitalCredentialField[],
    nonce?: string,
  ): DigitalCredentialProvider {
    return {
      protocol: 'openid4vp',
      request: {
        selector: {
          format: 'vc',
          fields,
        },
        nonce,
      },
    }
  }

  /**
   * Common field definitions for mDL credentials.
   */
  static readonly Fields = {
    ageOver18: {
      namespace: 'org.iso.18013.5.1',
      name: 'age_over_18',
    },
    ageOver21: {
      namespace: 'org.iso.18013.5.1',
      name: 'age_over_21',
    },
    givenName: {
      namespace: 'org.iso.18013.5.1',
      name: 'given_name',
    },
    familyName: {
      namespace: 'org.iso.18013.5.1',
      name: 'family_name',
    },
    birthDate: {
      namespace: 'org.iso.18013.5.1',
      name: 'birth_date',
    },
    portrait: {
      namespace: 'org.iso.18013.5.1',
      name: 'portrait',
    },
    documentNumber: {
      namespace: 'org.iso.18013.5.1',
      name: 'document_number',
    },
    issuingAuthority: {
      namespace: 'org.iso.18013.5.1',
      name: 'issuing_authority',
    },
  } as const satisfies Record<string, DigitalCredentialField>
}
