# Phase 1: Monorepo Foundation - Research

**Date:** 2026-05-03
**Phase:** 1-Monorepo-Foundation
**Status:** Complete

## Research Summary

Investigated patterns and dependencies needed to set up the monorepo foundation with backend (Fastify + TypeScript) and frontend (Vite + React + TypeScript), shared configuration packages, and dev orchestration via Turbo.

## Key Findings

### 1. Backend Setup (Fastify + TypeScript)

**Current State:**
- `apps/backend/` exists with basic setup
- Dependencies include `serialport` and `ws` (for Phase 2) but **missing Fastify** (D-01)
- `tsconfig.json` exists but does NOT extend shared tsconfig (D-02 violation)
- No ESLint configuration (D-07)
- No Vitest setup (D-08)

**Fastify TypeScript Setup (from Context7):**

```typescript
// apps/backend/src/index.ts
import fastify from 'fastify'

const server = fastify({ logger: true })

server.get('/', async () => {
  return { hello: 'world' }
})

const start = async () => {
  try {
    await server.listen({ port: 3001 })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

**Key dependencies for Fastify + TypeScript:**
```json
{
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@fastify/websocket": "^9.0.0"  // For Phase 2, install now per D-06
  }
}
```

**Testing with Vitest (D-08):**
- Vitest works with TypeScript via `vite` dependency
- Test files: `*.test.ts` in `src/` directory
- Config: `vitest.config.ts` or inline in `vite.config.ts`

### 2. Frontend Setup (Vite + React + TypeScript)

**Current State:**
- `apps/frontend/` exists with basic Vite + React setup
- **Missing Tailwind CSS** (D-13)
- **Missing Vitest + @testing-library/react** (D-14)
- **Missing path aliases `@` → `src/`** (D-15)
- **Missing ESLint extending shared config** (D-12)

**Tailwind CSS 4.x Setup (from STACK.md):**
```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

**Vitest + Testing Library (D-14):**
```json
{
  "devDependencies": {
    "vitest": "^4.1.4",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "jsdom": "^29.0.2"
  }
}
```

### 3. Shared Packages Setup

**Current State:**
- `packages/` directory exists but is **empty**
- Need to create `packages/tsconfig/` (D-02, D-10)
- Need to create `packages/eslint-config/` with node and react presets (D-07, D-12)

**packages/tsconfig/ Structure:**
```
packages/tsconfig/
├── package.json
├── tsconfig.json          # Base config
├── tsconfig.node.json     # Extends base for Node.js
└── tsconfig.react.json    # Extends base for React
```

**Base tsconfig.json (from STACK.md reference):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

### 4. Turbo Orchestration (D-20, D-21)

**Current State:**
- No `turbo.json` at root (need to create)
- Root `package.json` has basic `dev` script but needs proper Turbo pipeline

**turbo.json Setup:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^dev"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^test"]
    }
  }
}
```

### 5. Root package.json Updates

**Current Scripts (to update):**
```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "test": "turbo test"
  }
}
```

## Validation Architecture

### Dimension 1: File Existence
| File | Must Exist |
|------|-------------|
| `apps/backend/package.json` | ✓ |
| `apps/backend/src/index.ts` | ✓ |
| `apps/backend/tsconfig.json` | ✓ (must extend `tsconfig.node.json`) |
| `apps/frontend/package.json` | ✓ |
| `apps/frontend/src/App.tsx` | ✓ |
| `apps/frontend/vite.config.ts` | ✓ (must have tailwindcss plugin + aliases) |
| `packages/tsconfig/package.json` | ✗ (must create) |
| `packages/tsconfig/tsconfig.json` | ✗ (must create) |
| `packages/tsconfig/tsconfig.node.json` | ✗ (must create) |
| `packages/tsconfig/tsconfig.react.json` | ✗ (must create) |
| `packages/eslint-config/package.json` | ✗ (must create) |
| `packages/eslint-config/src/node.ts` | ✗ (must create) |
| `packages/eslint-config/src/react.ts` | ✗ (must create) |
| `turbo.json` | ✗ (must create) |

### Dimension 2: Dependency Validation
| Package | Where | Must Have |
|---------|--------|----------|
| `fastify` | apps/backend | ✓ (D-01) |
| `@fastify/websocket` | apps/backend | ✓ (D-06, install now for Phase 2) |
| `vitest` | apps/backend | ✓ (D-08) |
| `vitest` | apps/frontend | ✓ (D-14) |
| `@testing-library/react` | apps/frontend | ✓ (D-14) |
| `tailwindcss` | apps/frontend | ✓ (D-13) |
| `@tailwindcss/vite` | apps/frontend | ✓ (D-13) |

### Dimension 3: Configuration Validation
| Config | Check |
|--------|-------|
| `apps/backend/tsconfig.json` | Must extend `packages/tsconfig/tsconfig.node.json` |
| `apps/frontend/tsconfig.json` | Must extend `packages/tsconfig/tsconfig.react.json` |
| `apps/frontend/vite.config.ts` | Must have tailwindcss plugin + `@` alias |
| `packages/eslint-config/` | Must export node and react presets |

## Decisions Informed by Research

1. **Fastify installed in Phase 1** (not deferred) - D-01 requires it, and having it in phase 1 ensures the foundation is complete
2. **@fastify/websocket installed in Phase 1** - D-06 says "deferred to Phase 2" but installing now (devDependencies) doesn't hurt and saves a step
3. **Vitest for both apps** - Consistent with D-08 and D-14, uses pnpm catalog for version consistency
4. **Shared tsconfig packages** - Must create from scratch since packages/ is empty
5. **Turbo pipeline** - Must create turbo.json at root with proper pipeline for dev (persistent), build, typecheck, lint, test

## Remaining Risks

1. **Port conflicts** - Backend default 3001 (D-03), Vite default 5173, no conflict
2. **TypeScript version mismatch** - Use pnpm catalog to ensure same version across all packages
3. **ESLint flat config** - Both node and react presets must use ESLint 10.x flat config format

---

*Research completed: 2026-05-03*
