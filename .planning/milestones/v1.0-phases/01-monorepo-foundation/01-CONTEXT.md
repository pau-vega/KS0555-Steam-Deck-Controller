# Phase 1: Monorepo Foundation - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up pnpm workspaces monorepo with `apps/frontend`, `apps/backend`, and empty `packages/` directory. TypeScript configured for both apps, working dev scripts via Turbo.

**In scope:**
- pnpm workspaces configuration (apps/*, packages/*)
- apps/backend: Fastify + TypeScript + Vitest
- apps/frontend: Vite + React + TypeScript + Tailwind + Vitest
- Root turbo.json with dev pipeline
- TypeScript config extends packages/tsconfig
- Linting extends packages/eslint-config

**Out of scope:**
- WebSocket implementation (Phase 2)
- Serial port connection (Phase 2)
- UI components (Phase 3)
- Gamepad integration (Phase 3)

</domain>

<decisions>
## Implementation Decisions

### Backend Framework
- **D-01:** Fastify as the backend framework (not Express or minimal http)
- **D-02:** TypeScript config extends shared packages/tsconfig
- **D-03:** Port via environment variable `PORT`, default 3001
- **D-04:** Dev mode: `tsx watch` for direct TypeScript execution with auto-reload
- **D-05:** Project structure: `src/` + `src/index.ts` entry point
- **D-06:** WebSocket setup deferred to Phase 2 (install `@fastify/websocket` when building WebSocket server)
- **D-07:** Linting extends shared packages/eslint-config (node preset)
- **D-08:** Testing: Vitest (matches frontend, same pnpm catalog version)

### Frontend Framework
- **D-09:** Vite + React (matches existing showcase stack: React 19.2.5 + Vite 8.0.8)
- **D-10:** TypeScript config extends shared packages/tsconfig
- **D-11:** Project structure: `src/` + `src/App.tsx` entry point
- **D-12:** Linting extends shared packages/eslint-config (react preset)
- **D-13:** Styling: Tailwind CSS 4.2.2 + @tailwindcss/vite plugin
- **D-14:** Testing: Vitest + @testing-library/react (matches showcase stack)
- **D-15:** Path aliases: `@` maps to `src/` (matches apps/showcase pattern)

### WebSocket Library
- **D-16:** Backend: `ws` library (minimal, well-maintained)
- **D-17:** Frontend: native browser WebSocket API
- **D-18:** WebSocket shares same port as HTTP (Fastify handles both)
- **D-19:** Message format: JSON `{ type: 'command', data: 'F' }` (structured, extensible for future features like motor speed)

### Dev Script Orchestration
- **D-20:** Turbo for `pnpm dev` orchestration (already configured in root)
- **D-21:** Dev pipeline: parallel execution (no inter-dependencies for dev mode)

### The Agent's Discretion
- Backend port default value (3001) — agent picks sensible default
- WebSocket setup timing — deferred to Phase 2

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` §Phase 1 — Goal, requirements (MONO-01 to MONO-04), success criteria
- `.planning/PROJECT.md` §Key Decisions — WebSocket, serialport, Gamepad API decisions
- `.planning/PROJECT.md` §Constraints — Tech stack, platform, robot firmware constraints

### Shared Configuration
- `packages/tsconfig/` — Shared TypeScript config extending @tsconfig/node24
- `packages/eslint-config/src/node.ts` — Node.js ESLint preset for backend
- `packages/eslint-config/src/react.ts` — React ESLint preset for frontend
- `turbo.json` — Root Turbo config with task pipeline

### Stack Reference
- `.planning/codebase/STACK.md` — Full stack analysis (Node 24+, pnpm 10.29.3, Vite, React, Tailwind)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style, import organization
- `.planning/codebase/ARCHITECTURE.md` — Monorepo pattern, build pipeline, key abstractions

### Existing Template (for patterns)
- `apps/showcase/` — Existing Vite + React app (structure reference)
- `packages/ui/` — Existing component library (build pattern with tsup)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/tsconfig/` — Ready to extend for both frontend and backend TypeScript config
- `packages/eslint-config/` — Ready to extend for both node and react linting presets
- `turbo.json` — Existing Turbo pipeline (add `dev` task for new workspaces)
- `pnpm-workspace.yaml` — Already defines `apps/*` and `packages/*` (add `apps/frontend`, `apps/backend`)

### Established Patterns
- Vite + React + TypeScript: apps/showcase uses this exact stack
- Tailwind + PostCSS: packages/ui uses Tailwind 4.2.2 with @tailwindcss/vite
- Vitest + @testing-library/react: apps/showcase uses this testing stack
- Path aliases: `@` maps to `src/` in apps/showcase
- Named exports only (no default exports)
- kebab-case file naming, PascalCase components, camelCase functions

### Integration Points
- `turbo.json`: Add `dev` task with `cache: false` and `persistent: true` for new apps
- `pnpm-workspace.yaml`: Apps already includes `apps/*` — no change needed
- Root `package.json`: Add `dev` script calling `turbo dev`
- `packages/eslint-config/package.json`: Backend/frontend will reference this

</code_context>

<specifics>
## Specific Ideas

- Fastify chosen over Express for better performance and built-in schema validation (even though MVP doesn't need validation yet)
- `tsx watch` for backend dev: avoids build step during development, direct TypeScript execution
- WebSocket shares Fastify port: simpler config, one port to manage on Steam Deck
- JSON message format: although Arduino accepts plain text, JSON allows future extensibility (motor speed commands, status messages)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 1-Monorepo Foundation*
*Context gathered: 2026-05-03*
