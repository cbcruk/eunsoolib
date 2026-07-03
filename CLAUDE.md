# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Test**: `pnpm test` - Run all tests with Vitest
- **Test UI**: `pnpm test:ui` - Run tests with Vitest UI interface
- **Test Run**: `pnpm test:run` - Run tests once without watch mode

## Architecture Overview

This is a TypeScript monorepo containing utility packages organized by functionality. Each package in `/packages/` is self-contained with its own tests and follows consistent patterns.

### Key Technologies

- **Testing**: Vitest with jsdom environment, React Testing Library
- **State Management**: XState for complex state machines, Zustand for simpler stores
- **Storage**: Dexie for IndexedDB operations
- **Effect System**: Effect library for functional programming patterns
- **Build**: Vite for bundling and development

### Package Structure

Each package follows the same pattern:

- Main implementation file (e.g., `mole-game-manager.ts`)
- Test file with same name (e.g., `mole-game-manager.test.ts`)
- Some packages include example files (`.example.ts`)
- React components use `.tsx` extension

### Notable Packages

- **mole/**: Complete game engine with state machines, timers, spawners, and score management
- **shopping/**: E-commerce functionality using XState machines for cart and order management
- **authorization/**: Authentication strategies including Basic Auth
- **dexie/**: Database utilities using Dexie ORM
- **wordle/**: Game implementation with codec, timer, and validation utilities

### Testing Patterns

- Tests use Vitest globals (no imports needed for `describe`, `it`, `expect`)
- React components tested with React Testing Library
- Setup file at `/test/setup.ts` configures jest-dom
- Some packages use snapshot testing for complex outputs
- **Test descriptions in Korean**: Use Korean for test descriptions (e.g., `'ref.current가 null일 때 오버플로우가 false를 반환해야 함'`)
- **DOM Property Testing**: For DOM property mocking, use helper functions like `createPropertyManager()` to avoid code duplication

### State Management Patterns

- XState machines for complex workflows (cart, game states)
- Class-based managers for encapsulated functionality
- Zustand stores for React state management
- Effect library for functional composition

#### Framework-agnostic core + `useSyncExternalStore` layer

새 상태 관리 유틸리티를 설계할 때는 `react-*` 형태로 core를 만들지 말고, **UI 프레임워크를 모르는 싱글턴 core를 먼저 만들고 그 위에 얇은 React 레이어를 얹는다.** (참고 구현: `packages/sync-store`)

- **Core는 framework-agnostic**: `getState` / `setState` / `subscribe` 같은 원시 연산만 노출하는 싱글턴으로 구성하고, React 등 특정 UI 라이브러리를 import하지 않는다. 이렇게 하면 core를 React 없이 단독 테스트할 수 있고, 바닐라 JS나 다른 프레임워크에서도 재사용할 수 있다.
- **React 바인딩은 `useSyncExternalStore`로**: 구독/스냅샷 처리는 직접 `useState` + `useEffect`로 짜지 말고 React가 공식 지원하는 `useSyncExternalStore`에 위임한다 (tearing 방지, SSR 안전). selector로 slice를 선택할 때는 이전 참조를 `isEqual`(기본 `Object.is`)로 재사용해 불필요한 리렌더/무한 루프를 막고, `getServerSnapshot`도 함께 넘긴다.
- **도메인 동작은 core 밖에서**: store 인스턴스는 모듈 스코프 싱글턴으로 한 번만 생성하고, 도메인 액션(`increment`, `reset` 등)은 core를 얇게 유지하기 위해 store 바깥에서 정의한다.

## Code Review and Refactoring Guidelines

### When Reviewing Code

1. **Separate Concerns**: Split utility logic (hooks) from demo/presentation components
2. **Improve Reusability**: Add props and configuration options to make components flexible
3. **Type Safety**: Add proper TypeScript interfaces and generic types
4. **Backward Compatibility**: Maintain existing APIs while improving implementation

### Refactoring Patterns

- Extract reusable hooks from components (e.g., `useOverflowDetection`)
- Add proper TypeScript generics for flexible element types
- Create demo components with configurable props
- Use helper functions to reduce test code duplication

### Code Quality Preferences

- Prefer functional components with hooks over class components
- Use explicit TypeScript types over `any` or implicit types
- Korean test descriptions for better local readability
- Clean up meaningless tests (e.g., `expect(true).toBe(true)`)

When working on this codebase, follow the existing patterns and ensure all new functionality includes comprehensive tests.

## Git Commit Convention

- **Prefix 사용**: `fix:`, `feat:`, `refactor:`, `docs:`, `chore:` 등 commitlint 규칙 준수
- **한국어 메시지**: 커밋 메시지는 한국어로 작성
