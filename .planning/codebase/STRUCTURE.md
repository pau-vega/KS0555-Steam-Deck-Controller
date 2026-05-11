# Codebase Structure

**Analysis Date:** 2026-05-05

## Directory Layout

```
ks0555-steam-deck-controller/
├── apps/
│   ├── backend/              # Node.js Fastify backend server
│   │   ├── src/
│   │   │   ├── __tests__/    # Backend test files
│   │   │   ├── index.ts      # Server entry point
│   │   │   └── types.ts      # Backend type definitions
│   │   ├── vitest.config.ts  # Vitest configuration
│   │   └── package.json
│   └── frontend/             # React Vite frontend app
│       ├── src/
│       │   ├── components/   # UI components
│       │   ├── hooks/        # Custom React hooks
│       │   ├── app.tsx       # Main App component
│       │   ├── main.tsx      # Entry point
│       │   └── types.ts      # Frontend type definitions
│       ├── vitest.config.ts  # Vitest configuration
│       ├── vite.config.ts    # Vite configuration
│       └── package.json
├── packages/
│   ├── eslint-config/        # Shared ESLint configurations
│   │   ├── src/
│   │   │   ├── node.ts       # Node.js ESLint config
│   │   │   └── react.ts      # React ESLint config
│   │   └── package.json
│   └── tsconfig/            # Shared TypeScript configurations
│       ├── tsconfig.json     # Base TypeScript config
│       ├── tsconfig.node.json
│       ├── tsconfig.react.json
│       └── package.json
├── .planning/               # GSD workflow artifacts
│   ├── codebase/            # Codebase analysis docs
│   ├── phases/              # Phase planning documents
│   └── quick/               # Quick task records
├── .agents/                 # Agent configurations
│   ├── rules/               # Agent rules
│   └── skills/              # Agent skills (shadcn)
├── .claude/                 # Claude Code configurations
│   ├── hooks/               # Git hooks
│   ├── skills/              # Custom skills
│   └── worktrees/           # Git worktrees
├── pnpm-workspace.yaml      # pnpm workspace definition
├── turbo.json               # Turborepo configuration
├── package.json             # Root package.json
└── lefthook.yml             # Git hooks (commitlint, lint, format-check)
```

## Directory Purposes

**`apps/`:**
- Purpose: Application projects consuming shared packages
- Contains: Frontend (React) and Backend (Fastify) applications
- Key files: Each app has its own `package.json`, `tsconfig.json`, and config files

**`apps/frontend/src/components/`:**
- Purpose: React UI components for the controller interface
- Contains: `control-pad.tsx`, `status-bar.tsx` and their test files
- Pattern: One component per file with co-located `.test.tsx` files

**`apps/frontend/src/hooks/`:**
- Purpose: Custom React hooks for Bluetooth and gamepad functionality
- Contains: `use-bluetooth.ts`, `use-gamepad.ts` and their test files
- Pattern: `use-*` naming convention with co-located tests

**`apps/backend/src/`:**
- Purpose: Backend server logic
- Contains: `index.ts` (Fastify server), `types.ts`, and `__tests__/index.test.ts`
- Pattern: Flat structure with `__tests__` directory for test files

**`packages/`:**
- Purpose: Shared configurations and reusable code
- Contains: `tsconfig/` (TypeScript configs), `eslint-config/` (ESLint configs)
- Used by: Apps via workspace dependencies (`workspace:*` protocol)

**`packages/tsconfig/`:**
- Purpose: Centralized TypeScript configuration
- Contains: Base config and Node/React variants
- Key files: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.react.json`

**`packages/eslint-config/`:**
- Purpose: Shared ESLint rules for consistent code style
- Contains: Node and React ESLint configurations
- Key files: `src/node.ts`, `src/react.ts` (used via `--config` flag)

**`.planning/`:**
- Purpose: GSD workflow state and documentation
- Contains: Codebase analysis, phase plans, quick tasks
- Committed: Yes, contains project knowledge base

## Key File Locations

**Entry Points:**
- `apps/frontend/src/main.tsx`: React application entry point
- `apps/backend/src/index.ts`: Backend server entry point (build function exported for testing)
- `turbo.json`: Monorepo task orchestration entry point

**Configuration:**
- `pnpm-workspace.yaml`: Defines workspace packages (`apps/*`, `packages/*`)
- `packages/tsconfig/tsconfig.json`: Base TypeScript configuration with strict mode
- `apps/frontend/vite.config.ts`: Vite build tool configuration with React and Tailwind plugins
- `apps/frontend/vitest.config.ts`: Frontend test configuration (jsdom environment)
- `apps/backend/vitest.config.ts`: Backend test configuration (node environment)

**Core Logic:**
- `apps/frontend/src/app.tsx`: Main application component with state management
- `apps/frontend/src/hooks/use-bluetooth.ts`: Web Bluetooth API integration
- `apps/frontend/src/hooks/use-gamepad.ts`: Steam Deck gamepad polling
- `apps/backend/src/index.ts`: Fastify server with WebSocket and serial port handling

**Type Definitions:**
- `apps/frontend/src/types.ts`: Direction type (`"F" | "B" | "L" | "R" | "S"`)
- `apps/backend/src/types.ts`: ValidCommand, ServerConfig, SerialPortConfig interfaces

**Testing:**
- `apps/frontend/src/**/*.test.tsx`: Frontend component and hook tests
- `apps/backend/src/__tests__/*.test.ts`: Backend unit tests
- `apps/frontend/src/setupTests.ts`: Test setup file (imports @testing-library/jest-dom)

## Naming Conventions

**Files:**
- kebab-case for all filenames: `control-pad.tsx`, `use-bluetooth.ts`, `index.test.ts`
- React components use `.tsx` extension
- Test files use `.test.tsx` (frontend) or `.test.ts` (backend) suffix
- Hooks follow `use-*.ts` pattern (though imported as camelCase)

**Directories:**
- kebab-case for directory names: `apps/`, `packages/`, `__tests__/`
- Flat structure within apps (no deep nesting)

**Code Elements:**
- PascalCase for React components: `ControlPad`, `StatusBar`, `App`
- camelCase for functions and variables: `sendCommand`, `bleConnected`, `pollGamepad`
- camelCase for custom hooks: `useBluetooth`, `useGamepad` (imported name differs from filename)
- TypeScript types use PascalCase: `Direction`, `ValidCommand`, `ServerConfig`
- Interface names use PascalCase: `ControlPadProps`, `StatusBarProps`, `WebSocketMessage`

**Path Aliases:**
- `@/*`: Maps to `apps/frontend/src/*` (configured in `vite.config.ts` and `tsconfig.json`)

## Where to Add New Code

**New Frontend Feature:**
- Primary code: `apps/frontend/src/components/` or `apps/frontend/src/hooks/`
- Tests: Co-located with source (e.g., `control-pad.test.tsx` next to `control-pad.tsx`)
- Types: Add to `apps/frontend/src/types.ts` or create component-specific types

**New Backend Feature:**
- Implementation: `apps/backend/src/` (flat structure)
- Tests: `apps/backend/src/__tests__/` directory
- Types: Add to `apps/backend/src/types.ts`

**New Shared Configuration:**
- TypeScript config: `packages/tsconfig/` (extend base `tsconfig.json`)
- ESLint config: `packages/eslint-config/src/` (create new config file)

**Utilities:**
- Frontend shared helpers: Create in `apps/frontend/src/lib/` (if needed, not currently present)
- Backend shared helpers: Create in `apps/backend/src/lib/` or co-locate with usage

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow artifacts (phase plans, codebase docs, quick tasks)
- Generated: No (human and AI-authored)
- Committed: Yes

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (pnpm store)
- Committed: No (in `.gitignore`)

**`dist/`:**
- Purpose: Compiled output for packages (eslint-config, backend)
- Generated: Yes (via tsup or tsc)
- Committed: No (in `.gitignore`)

**`__tests__/`:**
- Purpose: Backend test files (alternative to co-location pattern)
- Generated: No
- Committed: Yes
- Note: Frontend uses co-located tests (`.test.tsx` next to source), backend uses `__tests__/` directory

---

*Structure analysis: 2026-05-05*
