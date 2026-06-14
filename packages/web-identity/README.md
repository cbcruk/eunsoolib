# @eunsoolib/web-identity

> Modern Web Identity APIs를 하나의 TypeScript 라이브러리로 통합

Google I/O 2025에서 발표된 최신 웹 인증/신원확인 API들을 통합하는 TypeScript 라이브러리입니다.

## 다루는 API

| 모듈                 | API                              | Chrome 버전 | 설명                                     |
| -------------------- | -------------------------------- | ----------- | ---------------------------------------- |
| `CredentialManager`  | Credential Manager               | 136+ (flag) | 비밀번호 + 패스키 + FedCM 통합 로그인 UI |
| `Passkeys`           | WebAuthn                         | 108+ / 136+ | 패스키 등록/인증, 자동생성, Signal API   |
| `FedCM`              | Federated Credential Management  | 132+        | 제휴 인증 (active/passive 모드)          |
| `DigitalCredentials` | Digital Credentials              | OT          | 디지털 지갑 기반 신원 확인               |
| `DBSC`               | Device Bound Session Credentials | 실험        | 기기 바인딩 세션                         |

## 설치

```bash
pnpm add @eunsoolib/web-identity
```

## Quick Start

```ts
import {
  WebIdentity,
  DigitalCredentials,
  Passkeys,
} from '@eunsoolib/web-identity'

const identity = new WebIdentity('example.com')

// 지원 기능 감지
const support = await identity.detectFeatures()
console.log(support)
// {
//   credentialManager: true,
//   webauthn: true,
//   conditionalMediation: true,
//   immediateMediation: true,
//   signalAPI: true,
//   fedcm: true,
//   ...
// }
```

## 사용 예시

### 1. 통합 로그인 (비밀번호 + 패스키)

하나의 브라우저 프롬프트에서 비밀번호와 패스키를 동시에 제공:

```ts
const result = await identity.signIn({
  password: true,
  publicKey: {
    challenge: serverChallenge,
    rpId: 'example.com',
  },
  mediation: 'immediate', // 이 기기에서 사용 가능한 것만
})

if (!result) {
  // 이 기기에 저장된 자격증명 없음 → 기존 로그인 UI 표시
  showLoginForm()
} else if (result.type === 'password') {
  // 비밀번호로 로그인
  await loginWithPassword(result.credential)
} else if (result.type === 'publicKey') {
  // 패스키로 로그인
  const serialized = Passkeys.serialize(result.credential)
  await verifyPasskeyOnServer(serialized)
}
```

### 2. 패스키 등록

```ts
const credential = await identity.registerPasskey({
  rp: { id: 'example.com', name: 'My App' },
  user: {
    id: new TextEncoder().encode(userId),
    name: 'alice@example.com',
    displayName: 'Alice',
  },
  challenge: serverChallenge,
})

// 서버로 전송
const data = Passkeys.serialize(credential)
await fetch('/api/passkey/register', {
  method: 'POST',
  body: JSON.stringify(data),
})
```

### 3. 패스키 자동 업그레이드 (Chrome 136+)

비밀번호 로그인 후, 사용자 방해 없이 패스키를 자동 생성:

```ts
// 비밀번호 로그인 성공 후
await identity.upgradeToPasskey({
  rp: { id: 'example.com', name: 'My App' },
  user: {
    id: new TextEncoder().encode(userId),
    name: 'alice@example.com',
    displayName: 'Alice',
  },
  challenge: serverChallenge,
})
// → 성공 시 패스키 생성됨 (UI 표시 없음)
// → 미지원 환경에선 null 반환 (에러 없음)
```

### 4. Autofill을 통한 패스키 로그인 (Conditional UI)

```ts
// 로그인 페이지 로드 시 호출
// <input autocomplete="username webauthn"> 이 필요
const passkey = await identity.passkeys.authenticateConditional({
  challenge: serverChallenge,
  rpId: 'example.com',
})

if (passkey) {
  const data = Passkeys.serialize(passkey)
  await verifyOnServer(data)
}
```

### 5. Signal API로 패스키 정리 (Chrome 132+)

서버에서 패스키를 삭제했을 때 비밀번호 관리자에 알림:

```ts
// 개별 패스키 삭제 알림
await identity.passkeys.signalUnknownCredential({
  rpId: 'example.com',
  credentialId: deletedCredentialId,
})

// 전체 유효 패스키 목록 동기화
await identity.passkeys.signalAllAcceptedCredentials({
  rpId: 'example.com',
  userId: userIdBuffer,
  allAcceptedCredentialIds: [credId1, credId2], // 서버의 최신 목록
})
```

### 6. FedCM 제휴 로그인

```ts
import { FedCM } from '@eunsoolib/web-identity'

// Active 모드: 버튼 클릭 후 프롬프트 표시
const credential = await identity.signInWithFederation([
  FedCM.provider(
    'https://accounts.google.com/.well-known/fedcm.json',
    'your-client-id',
    { nonce: serverNonce },
  ),
])

if (credential) {
  const token = (credential as any).token
  await verifyTokenOnServer(token)
}
```

멀티 IdP 지원 (Chrome 136+):

```ts
const credential = await identity.fedcm.signInMultiProvider(
  [
    FedCM.provider('https://google.com/.well-known/fedcm.json', 'client-1'),
    FedCM.provider('https://github.com/.well-known/fedcm.json', 'client-2'),
  ],
  { mode: 'active' },
)
```

### 7. 디지털 신원 확인

```ts
import { DigitalCredentials } from '@eunsoolib/web-identity'

// 연령 확인 (18세 이상인지만 확인, 생년월일 미공개)
const cred = await identity.verifyIdentity([
  DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
    DigitalCredentials.Fields.ageOver18,
  ]),
])

// 운전면허 정보 요청
const license = await identity.verifyIdentity([
  DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
    DigitalCredentials.Fields.givenName,
    DigitalCredentials.Fields.familyName,
    DigitalCredentials.Fields.portrait,
    DigitalCredentials.Fields.documentNumber,
  ]),
])
```

## 에러 처리

모든 에러는 `WebIdentityError`로 래핑됩니다:

```ts
import { WebIdentityError } from '@eunsoolib/web-identity';

try {
  const result = await identity.signIn({ ... });
} catch (error) {
  if (error instanceof WebIdentityError) {
    switch (error.code) {
      case 'NOT_SUPPORTED':
        // 브라우저가 해당 API를 지원하지 않음
        break;
      case 'NOT_ALLOWED':
        // 사용자가 거부하거나 자격증명 없음
        break;
      case 'ABORTED':
        // AbortController로 취소됨
        break;
      case 'SECURITY_ERROR':
        // HTTPS가 아니거나 보안 컨텍스트 아님
        break;
    }
  }
}
```

## 유틸리티

```ts
import { toBase64URL, fromBase64URL } from '@eunsoolib/web-identity'

// ArrayBuffer ↔ Base64URL 변환
const encoded = toBase64URL(credential.rawId)
const decoded = fromBase64URL(encoded)

// 챌린지 생성 (⚠️ 프로덕션에서는 서버에서 생성할 것)
const challenge = Passkeys.generateChallenge()
```

## 아키텍처

```
WebIdentity (facade)
├── CredentialManager    ← navigator.credentials.get/create/store
│   ├── password         ← PasswordCredential
│   ├── publicKey        ← PublicKeyCredential (passkey)
│   ├── identity         ← IdentityCredential (FedCM)
│   └── digital          ← DigitalCredential
├── Passkeys             ← WebAuthn 전용 API
│   ├── create/authenticate
│   ├── conditionalCreate (자동 업그레이드)
│   ├── Signal API       ← 비밀번호 관리자 동기화
│   └── serialize        ← 서버 전송용 직렬화
├── FedCM                ← 제휴 인증
│   ├── active/passive mode
│   ├── multi-provider
│   └── disconnect
├── DigitalCredentials   ← 디지털 지갑
│   ├── request (선별적 공개)
│   ├── issue (프로비저닝)
│   └── Fields (mDL 필드 상수)
└── DBSC                 ← 기기 바인딩 세션
```

## 브라우저 호환성

| 기능                      | Chrome      | Safari | Firefox |
| ------------------------- | ----------- | ------ | ------- |
| Credential Manager (기본) | ✅          | ✅     | ✅      |
| `mediation: 'immediate'`  | 136+ (flag) | ❌     | ❌      |
| Passkeys (WebAuthn)       | 108+        | 16+    | 119+    |
| Conditional UI (autofill) | 108+        | 16+    | ❌      |
| Conditional Create        | 136+        | ❌     | ❌      |
| Signal API                | 132+        | ❌     | ❌      |
| FedCM                     | 108+        | ❌     | ❌      |
| FedCM Active Mode         | 132+        | ❌     | ❌      |
| Digital Credentials       | OT          | ❌     | ❌      |
| DBSC                      | 실험        | ❌     | ❌      |

## 예제 & E2E 테스트

`src/examples/`에 패스키 **서버 검증 코드**와 **클라이언트 흐름** 예제가 있습니다.

- [`passkey-server.ts`](./src/examples/passkey-server.ts) — 프레임워크 비의존 서버 검증(`crypto.subtle`만 사용, Node·브라우저 공용). 챌린지 발급, 등록 시 **공개키만 저장**, 인증 시 ECDSA 서명을 공개키로 검증(ASN.1 DER → raw 변환, rpId 해시·origin·challenge 검사 포함).
- [`passkey-client.ts`](./src/examples/passkey-client.ts) — 이 패키지의 `Passkeys`로 패스키를 만들고 `Passkeys.serialize`로 서버 전송용 JSON 생성.

실제 인증기 없이 **Playwright 가상 인증기(CDP `WebAuthn`)** 로 등록→인증 전체 왕복을 검증하는 e2e가 있습니다 ([`passkey.e2e.browser.test.ts`](./src/passkey.e2e.browser.test.ts)) — 가상 인증기가 만든 진짜 ES256 서명을 서버가 WebCrypto로 검증하고, 챌린지 재사용(replay) 거부까지 확인합니다.

```bash
# 브라우저(Chromium) 프로젝트에서 실행
pnpm exec vitest run --project browser packages/web-identity
```

## 참고 자료

- [Chrome I/O 2025: 사용자 인증 및 본인 인증 재구성](https://developer.chrome.com/blog/io25-web-identity)
- [WebAuthn Immediate Mediation 설명](https://github.com/nicklasb/webauthn/wiki/Explainer:-WebAuthn-immediate-mediation)
- [Conditional Passkey Creation](https://developer.chrome.com/docs/identity/webauthn-conditional-create)
- [Signal API](https://developer.chrome.com/docs/identity/webauthn-signal-api)
- [FedCM Chrome 132 Updates](https://privacysandbox.google.com/blog/fedcm-chrome-132-updates)
- [Digital Credentials API Origin Trial](https://developer.chrome.com/blog/digital-credentials-api-origin-trial)
- [DBSC](https://developer.chrome.com/docs/web-platform/device-bound-session-credentials)

## License

MIT
