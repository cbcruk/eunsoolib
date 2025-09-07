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