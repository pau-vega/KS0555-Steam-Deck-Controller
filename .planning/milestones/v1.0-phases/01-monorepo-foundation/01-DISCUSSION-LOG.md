# Phase 1: Monorepo Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 1-Monorepo-Foundation
**Areas discussed:** Backend framework, Frontend framework, WebSocket library, Dev script orchestration

---

## Backend Framework

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal Node.js http (Recommended) | Matches PROJECT.md 'minimal Node.js backend' requirement. No dependencies, just Node 24+ built-in http + WebSocket upgrade. | |
| Express | Most common, huge middleware ecosystem. Adds dependency but familiar pattern. | |
| Fastify (Recommended) | Faster than Express, built-in schema validation. Adds dependency, JSON-centric. | ✓ |
| You decide | Let the agent pick based on phase requirements. | |

**User's choice:** Fastify

---

## Backend TypeScript Config

| Option | Description | Selected |
|--------|-------------|----------|
| Extend shared tsconfig (Recommended) | Use packages/tsconfig as base, matches monorepo pattern. Already extends @tsconfig/node24. | ✓ |
| Standalone tsconfig | Independent config for backend. More isolated but duplicates settings. | |
| You decide | Agent picks based on monorepo conventions. | |

**User's choice:** Extend shared tsconfig

---

## Backend Port Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable (Recommended) | PORT env var, default 3001. Flexible for deployment, matches production habits. | ✓ |
| Hardcoded in config | Set port directly in backend code. Simpler but less flexible. | |
| You decide | Agent picks sensible default. | |

**User's choice:** Environment variable (PORT, default 3001)

---

## Backend Dev Mode

| Option | Description | Selected |
|--------|-------------|----------|
| tsx watch (Recommended) | tsx runs TS directly with Node, watch mode auto-reloads. Matches simplicity goal, no build step needed for dev. | ✓ |
| tsup + watch | Bundle with tsup (like packages/ui), watch for changes. Produces dist/, adds build step. | |
| ts-node + nodemon | Classic approach, heavier dependency set. ts-node runs TS, nodemon watches. | |
| You decide | Agent picks simplest approach. | |

**User's choice:** tsx watch

---

## Backend Project Structure

| Option | Description | Selected |
|--------|-------------|----------|
| src/ + index.ts (Recommended) | Matches apps/showcase pattern. src/index.ts entry, typescript compiles from src/. | ✓ |
| Flat (index.ts only) | Single file at apps/backend/index.ts. Simplest for MVP, but no room for growth. | |
| You decide | Agent picks structure matching monorepo conventions. | |

**User's choice:** src/ + index.ts

---

## Backend WebSocket Setup Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 2 (Recommended) | Phase 1 = pure foundation. Add @fastify/websocket when building the actual WebSocket server in Phase 2. | ✓ |
| Set up now | Install @fastify/websocket in Phase 1 so backend is ready. Aligns with 'working dev scripts' success criterion. | |
| You decide | Agent decides based on phase boundaries. | |

**User's choice:** Defer to Phase 2

---

## Backend Linting/Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Extend shared eslint-config (Recommended) | Use packages/eslint-config with node preset. Matches monorepo pattern, single config source. | ✓ |
| Separate ESLint config | Own eslint.config.ts in apps/backend. More isolated, duplicates node rules. | |
| You decide | Agent picks monorepo-conventional approach. | |

**User's choice:** Extend shared eslint-config

---

## Backend Testing Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest (Recommended) | Matches frontend testing stack. Same catalog version in pnpm, consistent across workspaces. | ✓ |
| None in Phase 1 | No tests until Phase 2 when real logic exists. Keeps Phase 1 minimal. | |
| You decide | Agent picks based on phase scope. | |

**User's choice:** Vitest

---

## Frontend Framework

| Option | Description | Selected |
|--------|-------------|----------|
| Vite + React (Recommended) | Matches existing showcase setup. React 19.2.5 + Vite 8.0.8 already in stack, Base UI + Tailwind ready. | ✓ |
| Vite + Vanilla TS | Lighter weight, no React overhead. Robot control UI is simple — no complex state needed. | |
| You decide | Agent picks based on project goals. | |

**User's choice:** Vite + React

---

## Frontend TypeScript Config

| Option | Description | Selected |
|--------|-------------|----------|
| Extend shared tsconfig (Recommended) | Use packages/tsconfig as base. Matches monorepo pattern, extends @tsconfig/node24. | ✓ |
| Vite's default tsconfig | Let Vite scaffold its own. Simpler but diverges from monorepo convention. | |
| You decide | Agent picks monorepo-conventional approach. | |

**User's choice:** Extend shared tsconfig

---

## Frontend Project Structure

| Option | Description | Selected |
|--------|-------------|----------|
| src/ + App.tsx (Recommended) | Matches apps/showcase pattern. src/App.tsx entry, src/main.tsx mount point. | ✓ |
| Flat (index.html + src/) | Vite default scaffold. index.html at root, src/ for TSX files. | |
| You decide | Agent picks Vite-conventional structure. | |

**User's choice:** src/ + App.tsx

---

## Frontend Linting/Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Extend shared eslint-config (Recommended) | Use packages/eslint-config with react preset. Matches monorepo pattern, single config source. | ✓ |
| Separate ESLint config | Own eslint.config.ts in apps/frontend. More isolated, duplicates react rules. | |
| You decide | Agent picks monorepo-conventional approach. | |

**User's choice:** Extend shared eslint-config

---

## Frontend Styling Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind CSS (Recommended) | Matches existing stack (Tailwind 4.2.2 + @tailwindcss/vite). Ready for robot control UI in Phase 3. | ✓ |
| CSS Modules | Vite built-in, no extra deps. Simpler but diverges from rest of project. | |
| None in Phase 1 | Bare React in Phase 1, add styling when building UI in Phase 3. | |
| You decide | Agent picks based on project stack. | |

**User's choice:** Tailwind CSS

---

## Frontend Testing Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest + @testing-library/react (Recommended) | Matches existing showcase stack. Same catalog version in pnpm, consistent across workspaces. | ✓ |
| None in Phase 1 | No tests until Phase 3 when UI components exist. Keeps Phase 1 minimal. | |
| You decide | Agent picks based on phase scope. | |

**User's choice:** Vitest + @testing-library/react

---

## Frontend Path Aliases

| Option | Description | Selected |
|--------|-------------|----------|
| Yes: @ maps to src/ (Recommended) | Matches apps/showcase pattern. Allows imports like @/components/Button. | ✓ |
| None | Use relative imports only. Simpler, no tsconfig paths config needed. | |
| You decide | Agent picks Vite-conventional setup. | |

**User's choice:** Yes: @ maps to src/

---

## WebSocket Library

| Option | Description | Selected |
|--------|-------------|----------|
| ws on backend + native WebSocket on frontend (Recommended) | ws is minimal, well-maintained Node.js library. Frontend uses browser-native WebSocket API. Matches 'low latency' core value. | ✓ |
| Socket.IO | Adds fallback transports, rooms, broadcasting. Heavier, but more features than needed for MVP robot control. | |
| You decide | Agent picks simplest approach for low-latency robot control. | |

**User's choice:** ws on backend + native WebSocket on frontend

---

## WebSocket Port

| Option | Description | Selected |
|--------|-------------|----------|
| Same port (Recommended) | Fastify serves HTTP + WebSocket on same port. Simpler config, one port to manage. | ✓ |
| Separate port | WebSocket on its own port (e.g., 3002). Isolates protocols, but more complex. | |
| You decide | Agent picks simplest approach. | |

**User's choice:** Same port (Fastify)

---

## WebSocket Message Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON (Recommended) | Structured messages: { type: 'command', data: 'F' }. Extensible for future features like motor speed. | ✓ |
| Plain text | Just send 'F', 'B', 'S' directly. Matches Arduino firmware format exactly, simplest for MVP. | |
| You decide | Agent picks based on robot protocol needs. | |

**User's choice:** JSON

---

## Dev Script Orchestration Tool

| Option | Description | Selected |
|--------|-------------|----------|
| Turbo (Recommended) | Already configured in root turbo.json. pnpm dev in each workspace via turbo pipeline. | ✓ |
| pnpm recursively | pnpm -r run dev. Simpler but no caching/pipeline features. | |
| You decide | Agent picks monorepo-conventional approach. | |

**User's choice:** Turbo

---

## Turbo Dev Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel (Recommended) | All workspace dev scripts run simultaneously via turbo. Fastest, no inter-dependencies for dev mode. | ✓ |
| Sequential with deps | Respect dependsOn in turbo.json. Useful if backend must start before frontend, but adds complexity. | |
| You decide | Agent picks simplest Turbo config. | |

**User's choice:** Parallel

---

## The Agent's Discretion

- Backend port default value (3001) — user said "you decide"
- WebSocket setup timing — deferred to Phase 2 (user agreed with recommendation)

---

## Deferred Ideas

None — discussion stayed within phase scope.
