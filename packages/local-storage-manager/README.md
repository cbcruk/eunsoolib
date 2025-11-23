# @eunsoolib/local-storage-manager

localStorage를 타입 안전하게 관리하는 유틸리티 라이브러리

## 설치

```bash
pnpm add @eunsoolib/local-storage-manager
```

## 사용법

### LocalStorageManager

단일 값을 저장/조회할 때 사용합니다.

```typescript
import { LocalStorageManager } from '@eunsoolib/local-storage-manager'

// 타입 지정
const storage = new LocalStorageManager<{ theme: string; fontSize: number }>('settings')

// 저장
storage.save({ theme: 'dark', fontSize: 14 })

// 조회
const settings = storage.load() // { theme: 'dark', fontSize: 14 } | null

// 삭제
storage.remove()
```

### LocalStorageMapManager

Map 형태의 데이터를 관리할 때 사용합니다.

```typescript
import { LocalStorageMapManager } from '@eunsoolib/local-storage-manager'

type User = { id: string; name: string; status: 'active' | 'inactive' }

const userStore = new LocalStorageMapManager<string, User>('users')

// 저장 (chaining 가능)
userStore
  .set('user1', { id: 'user1', name: 'Alice', status: 'active' })
  .set('user2', { id: 'user2', name: 'Bob', status: 'inactive' })

// 조회
userStore.get('user1') // { id: 'user1', name: 'Alice', status: 'active' }
userStore.has('user1') // true
userStore.size // 2

// 순회
[...userStore.keys()]    // ['user1', 'user2']
[...userStore.values()]  // [User, User]
[...userStore.entries()] // [['user1', User], ['user2', User]]
userStore.toArray()      // [['user1', User], ['user2', User]]

// 삭제
userStore.delete('user1') // true
userStore.clear()         // 전체 삭제
```

## API

### LocalStorageManager<T>

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `load()` | `T \| null` | 저장된 데이터 조회 |
| `save(value)` | `void` | 데이터 저장 |
| `remove()` | `void` | 데이터 삭제 |

### LocalStorageMapManager<K, V>

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `set(key, value)` | `this` | 값 저장 (chaining 가능) |
| `get(key)` | `V \| undefined` | 값 조회 |
| `has(key)` | `boolean` | 키 존재 여부 |
| `delete(key)` | `boolean` | 값 삭제 |
| `clear()` | `void` | 전체 삭제 |
| `size` | `number` | 저장된 항목 수 |
| `keys()` | `IterableIterator<K>` | 모든 키 |
| `values()` | `IterableIterator<V>` | 모든 값 |
| `entries()` | `IterableIterator<[K, V]>` | 모든 [키, 값] 쌍 |
| `toArray()` | `[K, V][]` | 배열로 변환 |

## 특징

- **타입 안전성**: 제네릭을 통한 타입 추론
- **자동 직렬화**: JSON.stringify/parse 자동 처리
- **영속성**: localStorage 기반으로 브라우저 종료 후에도 데이터 유지
- **Map 호환 API**: `LocalStorageMapManager`는 네이티브 Map과 유사한 인터페이스 제공
