# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- TypeScript 5.9.3 - Used in `apps/frontend` and `packages/eslint-config` for type-safe frontend development and tooling
- TypeScript 5.7.0 - Used in `apps/backend` for server-side type safety

**Secondary:**
- JavaScript - Used in config files (`vitest.config.js`, `vite.config.js`) and tooling setup

## Runtime

**Environment:**
- Node.js v24 (specified in `.nvmrc` and `package.json` engines field: `>=18.0.0`)

**Package Manager:**
- pnpm 10.29.3
- Lockfile: `pnpm-lock.yaml` present
- Workspaces: Configured via `pnpm-workspace.yaml` with `apps/*` and `packages/*`

## Frameworks

**Core:**
- React 19.2.5 - UI library for frontend (`apps/frontend`)
- React DOM 19.2.5 - React rendering for web (`apps/frontend`)
- Fastify 4.16.0 - Web framework for backend server (`apps/backend`)

**Testing:**
- Vitest 4.1.4 - Unit test framework (frontend: `apps/frontend/vitest.config.ts`, backend: `apps/backend/vitest.config.ts`)
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Custom Jest matchers for DOM assertions
- jsdom 29.0.2 - JavaScript implementation of web standards for testing environment
- @vitest/coverage-v8 4.1.4 - V8-based coverage provider for backend

**Build/Dev:**
- Vite 8.0.8 - Fast build tool and dev server for frontend (`apps/frontend/vite.config.ts`)
- @vitejs/plugin-react 6.0.0 - React plugin for Vite
- Turbo 2.9.8 - Monorepo task orchestration (`turbo.json`)
- tsup 8.5.1 - TypeScript bundler for `packages/eslint-config`
- tsx 4.19.0 - TypeScript runtime for backend development (`apps/backend`)
- Tailwind CSS 4.2.2 - Utility-first CSS framework (`apps/frontend`)
- @tailwindcss/vite 4.2.2 - Vite plugin for Tailwind CSS integration

## Key Dependencies

**Critical:**
- serialport 12.0.0 - Serial communication for robot control (`apps/backend/src/index.ts`)
- @fastify/websocket 9.0.0 - WebSocket support for real-time frontend-backend communication
- ws 8.18.0 - WebSocket implementation for backend
- @types/web-bluetooth 0.0.21 - Type definitions for Web Bluetooth API

**Infrastructure:**
- @commitlint/cli 20.5.3 - Commit message linting
- @commitlint/config-conventional 20.5.3 - Conventional commits configuration
- ESLint 10.3.0 - JavaScript/TypeScript linting (`packages/eslint-config`)
- @typescript-eslint/eslint-plugin 8.59.1 - TypeScript support for ESLint
- @typescript-eslint/parser 8.59.1 - TypeScript parser for ESLint
- Prettier 3.8.3 - Code formatter
- lefthook 2.1.6 - Git hooks manager (`lefthook.yml`)

## Configuration

**Environment:**
- No `.env` files detected - Configuration via environment variables (e.g., `PORT` for backend)
- Backend reads `PORT` env var (default: 3001) in `apps/backend/src/index.ts`

**Build:**
- `turbo.json` - Task orchestration with pipeline definitions for dev, build, typecheck, lint, test
- `tsconfig.json` (root) - Base TypeScript config in `packages/tsconfig/tsconfig.json`:
  - Target: ES2022
  - Module: ESNext
  - Module Resolution: bundler
  - Strict mode enabled
  - `noUncheckedIndexedAccess` enabled
- `tsconfig.react.json` - React-specific config with `jsx: react-jsx` and DOM libraries
- `tsconfig.node.json` - Node.js config with declarations enabled
- `.prettierrc` - Prettier config: `{ "semi": false, "printWidth": 120 }`
- `commitlint.config.ts` - Extends `@commitlint/config-conventional`

## Platform Requirements

**Development:**
- Node.js >= 18.0.0 (v24 recommended per `.nvmrc`)
- pnpm 10.29.3
- macOS/Linux/Windows supporting Node.js v24
- Bluetooth support for Web Bluetooth API (for robot connectivity)
- Serial port access for robot communication

**Production:**
- Backend: Node.js server environment with serial port access
- Frontend: Static site hosting (Vite build output in `dist/`)
- WebSocket endpoint: `ws://localhost:3001/ws` (configurable via `PORT` env var)
- Serial device: `/dev/rfcomm0` at 9600 baud (configured in `apps/backend/src/index.ts`)

---

*Stack analysis: 2026-05-05*
