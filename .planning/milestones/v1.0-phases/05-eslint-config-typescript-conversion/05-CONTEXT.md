# Phase 5: ESLint Config TypeScript Conversion - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the shared eslint-config package from plain JavaScript to TypeScript ESM. Delivers: `packages/eslint-config/src/node.js` → `node.ts`, `packages/eslint-config/src/react.js` → `react.ts`, tsup build config, and updated package.json with ESM + types.

**In scope:**
- Rename `node.js` → `node.ts` and `react.js` → `react.ts`
- Convert `module.exports` → `export default` (ESM)
- Convert `require()` → `import type` + `import` statements
- Add `tsup.config.ts` for `.ts` → `.js` + `.d.ts` compilation
- Update `package.json`: `"type": "module"`, `"main": "dist/node.js"`, `"types": "dist/node.d.ts"`

**Out of scope:**
- Adding new ESLint rules (per PROJECT.md Out of Scope)
- Changing plugin versions or adding new plugins
- Modifying consuming apps' eslint.config.ts files

</domain>

<decisions>
## Implementation Decisions

### Export format
- **D-01:** Use ESM `export default [...]` instead of `module.exports = [...]`
- **D-02:** Set `"type": "module"` in `packages/eslint-config/package.json`

### Import style
- **D-03:** Use `import type { Plugin } from "eslint-plugin-react"` for type-only imports
- **D-04:** Use `import(...)` for runtime plugin loading (satisfies `@typescript-eslint/consistent-type-imports` rule)
- **D-05:** Plugin types: `import type { Plugin as ESLintPlugin } from "eslint-plugin-react"` to avoid naming conflicts

### Build step
- **D-06:** Use tsup to compile `.ts` → `.js` + `.d.ts` (matches `packages/ui` pattern)
- **D-07:** `tsup.config.ts` outputs to `dist/` with ESM format
- **D-08:** Update `package.json` `"main": "dist/node.js"` and `"types": "dist/node.d.ts"`

### Config file naming
- **D-09:** Rename `node.js` → `node.ts` and `react.js` → `react.ts`
- **D-10:** Matches CONVENTIONS.md pattern: `eslint.config.ts` (not `.js`)

### Prior decisions carried forward (from Phase 1 + Phase 4)
- **D-11:** Backend ESLint uses `packages/eslint-config/src/node.js` (Phase 1 D-07)
- **D-12:** Frontend ESLint uses `packages/eslint-config/src/react.js` (Phase 1 D-12)
- **D-13:** `@typescript-eslint/parser` already added to react.js config (Phase 4 D-15)
- **D-14:** `tsconfigRootDir: process.cwd()` already set in both configs (Phase 4 D-16)
- **D-15:** ESLint overrides for `*.config.ts` files already added (Phase 4 D-17)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` §Phase 5 — Goal, requirements CLEAN-02 through CLEAN-04, success criteria
- `.planning/REQUIREMENTS.md` — v1.1 requirements (CLEAN-02, CLEAN-03, CLEAN-04)

### Project Context
- `.planning/PROJECT.md` — MVP scope, constraints (simple Node.js, no new ESLint rules)
- `.planning/PROJECT.md` §Out of Scope — "ESLint rule additions: Only convert existing rules to TypeScript"

### ESLint Config Codebase (files to convert)
- `packages/eslint-config/src/node.js` — Node.js preset (26 lines, perfectionist plugin + tsconfig override)
- `packages/eslint-config/src/react.js` — React preset (20 lines, react + react-hooks + perfectionist plugins)
- `packages/eslint-config/package.json` — Package metadata, peer dependencies

### Prior Phase Context
- `.planning/phases/01-monorepo-foundation/01-CONTEXT.md` — Phase 1 decisions D-07 (node ESLint), D-12 (react ESLint)
- `.planning/STATE.md` §Decisions Made — Phase 4 decisions D-15, D-16, D-17 (ESLint config fixes)

### Build Patterns
- `.planning/codebase/STACK.md` — tsup 8.5.1 for TypeScript bundling (used in packages/ui)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns: `eslint.config.ts` (not `.js`), ESM exports
- `packages/ui/tsup.config.ts` — Reference tsup config pattern (ESM format, `dts: true`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **tsup bundler**: Already used in `packages/ui` for TypeScript compilation — copy `tsup.config.ts` pattern
- **ESLint flat config**: Both files already use ESLint v9+ flat config array format (no rewrite needed)

### Established Patterns
- **ESM modules**: Project uses `"type": "module"` in package.json for ESM (check `packages/ui/package.json`)
- **TypeScript strict mode**: All packages extend `@ks0555/tsconfig` base configs
- **Named exports only**: No default exports per project conventions
- **`import type` syntax**: Enforced by `@typescript-eslint/consistent-type-imports` rule

### Integration Points
- **package.json**: Update `"main"` to `dist/node.js`, add `"types": "dist/node.d.ts"`, set `"type": "module"`
- **tsup.config.ts**: Configure entry points `src/node.ts` and `src/react.ts`, output to `dist/`
- **Consuming apps**: `apps/backend` and `apps/frontend` import from `@ks0555/eslint-config` — must work after conversion

</code_context>

<specifics>
## Specific Ideas

- Plugin type pattern: `import type { Plugin as PerfectionistPlugin } from "eslint-plugin-perfectionist"` then `plugins: { "perfectionist": require("eslint-plugin-perfectionist") as PerfectionistPlugin }` — or use `import()` directly with type assertion
- tsup config: Single config handling both `node.ts` and `react.ts` entry points, output ESM format with `.d.ts` generation
- Keep `files: ["**/*.ts"]` patterns unchanged — they work with both `.js` and `.ts` source in consuming apps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-ESLint Config TypeScript Conversion*
*Context gathered: 2026-05-05*
