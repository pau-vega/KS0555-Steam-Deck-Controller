# Roadmap: Steam Deck Robot Controller

## Phases

- [x] **Phase 1: Monorepo Foundation** - pnpm workspaces, TypeScript, dev scripts
- [x] **Phase 2: Backend — WebSocket + Bluetooth Serial** - Node.js backend bridging WebSocket to Bluetooth serial
- [x] **Phase 3: Frontend — React UI + Gamepad Control** - React UI with manual buttons, gamepad, auto-reconnect
- [ ] **Phase 4: TypeScript Quality Hardening** - Delete leftover JS files and enforce TS best practices across codebase
- [ ] **Phase 5: ESLint Config TypeScript Conversion** - Convert eslint-config package from JS to TypeScript ESM

## Phase Details

### Phase 1: Monorepo Foundation
**Goal**: Set up pnpm workspaces monorepo with frontend and backend apps, TypeScript configured, and working dev scripts.
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04
**Success Criteria** (what must be TRUE):
  1. `pnpm install` from root installs all dependencies without errors
  2. `pnpm dev` starts both frontend and backend development servers
  3. Both apps have TypeScript configured with strict mode
  4. Workspace structure has `apps/frontend`, `apps/backend`, and empty `packages/` directory
**Plans**: 01-01-PLAN.md, 01-02-PLAN.md, 01-03-PLAN.md, 01-04-PLAN.md

### Phase 2: Backend — WebSocket + Bluetooth Serial
**Goal**: Build Node.js backend that connects to DX-BT24 via serial port and bridges WebSocket commands to Bluetooth serial.
**Depends on**: Phase 1
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, SAFE-01, SAFE-02
**Success Criteria** (what must be TRUE):
  1. WebSocket server starts and accepts connections on a configurable port
  2. Serial connection to `/dev/rfcomm0` at 9600 baud establishes successfully
  3. Sending "F" via WebSocket results in "F" written to serial port
  4. Serial disconnection triggers auto-reconnect with backoff
  5. WebSocket client disconnect triggers "S" written to serial port
  6. Console logs show command receipt and serial status changes
**Plans**: 02-01-PLAN.md, 02-02-PLAN.md

### Phase 3: Frontend — React UI + Gamepad Control
**Goal**: Build React UI with connection status, manual buttons, gamepad support, and WebSocket communication.
**Depends on**: Phase 2
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05, FRONT-06, FRONT-07, FRONT-08
**Success Criteria** (what must be TRUE):
  1. UI displays connection status that updates when WebSocket connects/disconnects
  2. Manual buttons (F, B, L, R, S) send commands via WebSocket when clicked
  3. Last sent command is displayed on screen
  4. Gamepad stick input maps to correct robot commands with visible feedback
  5. Analog stick deadzone prevents jitter from triggering commands
  6. Commands only sent on direction change, not continuously
  7. WebSocket auto-reconnects if backend restarts
**Plans**: 03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md
**UI hint**: yes

### Phase 4: TypeScript Quality Hardening
**Goal**: Remove all leftover JS files from the frontend and eliminate TypeScript anti-patterns (any, missing return types, missing import type) so the entire codebase is strictly typed and lint-clean.
**Depends on**: Phase 3
**Requirements**: CLEAN-01, TS-01, TS-02, TS-03, VAL-01, VAL-02, VAL-03, VAL-04
**Success Criteria** (what must be TRUE):
  1. All 13 leftover `.js` files in `apps/frontend/src/` are deleted and no JS file remains alongside a `.ts`/`.tsx` equivalent
  2. `grep -r "any" apps/ packages/` returns zero hits in `.ts`/`.tsx` files
  3. Every top-level non-hook/non-component function in `.ts`/`.tsx` files has an explicit return type annotation
  4. All type-only imports across the monorepo use `import type` syntax
  5. `pnpm build`, `pnpm typecheck`, and `pnpm lint` all complete with zero errors
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Delete 13 leftover JS files from apps/frontend/src/
- [ ] 04-02-PLAN.md — Fix TS anti-patterns (any, import type, return types)
- [ ] 04-03-PLAN.md — Validation gate (build, typecheck, lint, TS rules)

### Phase 5: ESLint Config TypeScript Conversion
**Goal**: Convert the shared eslint-config package from plain JavaScript to TypeScript ESM so the package itself is type-safe and consistent with the rest of the monorepo.
**Depends on**: Phase 4
**Requirements**: CLEAN-02, CLEAN-03, CLEAN-04
**Success Criteria** (what must be TRUE):
  1. `packages/eslint-config/src/node.js` no longer exists — replaced by a `.ts` module exporting the same config
  2. `packages/eslint-config/src/react.js` no longer exists — replaced by a `.ts` module exporting the same config
  3. Both `apps/frontend` and `apps/backend` import from eslint-config without any import errors or type errors
  4. `pnpm build`, `pnpm typecheck`, and `pnpm lint` all complete with zero errors after the conversion
  5. ts-reviewer agent passes on the converted eslint-config package
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Foundation | 4/4 | Done | 2026-05-05 |
| 2. Backend — WebSocket + Bluetooth Serial | 2/2 | Done | 2026-05-05 |
| 3. Frontend — React UI + Gamepad Control | 3/3 | Done | 2026-05-05 |
| 4. TypeScript Quality Hardening | 1/3 | In Progress | - |
| 5. ESLint Config TypeScript Conversion | 0/? | Not started | - |
