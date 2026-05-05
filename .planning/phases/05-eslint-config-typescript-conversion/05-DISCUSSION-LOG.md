# Phase 5: ESLint Config TypeScript Conversion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 5-ESLint Config TypeScript Conversion
**Areas discussed:** Export format, Import style, Build step, Config file naming

---

## Export format

| Option | Description | Selected |
|--------|-------------|----------|
| ESM export default | Use export default [...] — modern ESM, matches eslint.config.ts convention in CONVENTIONS.md. Requires "type": "module" in package.json. | ✓ |
| CommonJS with export= | Keep module.exports = [...] with TypeScript type annotation (export =). Current style preserved, works in .ts files. | |

**User's choice:** ESM export default
**Notes:** Modern ESM approach, consistent with eslint.config.ts patterns in codebase.

---

## Import style

| Option | Description | Selected |
|--------|-------------|----------|
| import type + import | import type { Plugin } from 'eslint-plugin-react' for type, then import() for runtime. Clean separation per @typescript-eslint/consistent-type-imports rule. | ✓ |
| inline import type | import { type Plugin } from 'eslint-plugin-react' — shorthand, single line, satisfies consistent-type-imports. | |
| You decide | Agent picks based on existing codebase patterns in apps/backend and packages/ui. | |

**User's choice:** import type + import
**Notes:** Satisfies @typescript-eslint/consistent-type-imports rule — clean separation of type vs runtime imports.

---

## Build step

| Option | Description | Selected |
|--------|-------------|----------|
| tsup build (Recommended) | Add tsup.config.ts like packages/ui. Compiles .ts → .js, generates .d.ts. Keep "main": "dist/node.js" in package.json. | ✓ |
| Direct .ts entry | Point "main" to src/node.ts with "type": "module". Needs tsx/ts-node at runtime for consuming apps. Simpler but non-standard. | |

**User's choice:** tsup build
**Notes:** Consistent with packages/ui build pattern. Generates .d.ts type declarations for consumers.

---

## Config file naming

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to .ts (Recommended) | node.js → node.ts, react.js → react.ts. Matches CONVENTIONS.md eslint.config.ts pattern. tsup compiles them to .js in dist/. | ✓ |
| Keep .js extension | Write TypeScript syntax in .js files with // @ts-check. Unusual but avoids rename. tsup can still compile .js files. | |

**User's choice:** Rename to .ts
**Notes:** Matches CONVENTIONS.md pattern for eslint config files.

---

## The agent's Discretion

- Plugin type import pattern: Agent decides exact syntax for `import type { Plugin }` + `import()` runtime loading
- tsup config details: Agent sets up entry points and ESM output format
- package.json specifics: Agent updates "main", "types", and "type" fields appropriately

---

## Deferred Ideas

None — discussion stayed within phase scope.
