# Coding Conventions

**Analysis Date:** 2026-05-05

## Naming Patterns

**Files:**
- kebab-case for all source files: `button.tsx`, `utils.ts`, `accordion.tsx`
- Test files use `.test.ts` or `.spec.ts` suffix: `utils.test.ts`, `button.test.tsx`
- Component files use `.tsx` extension; non-JSX files use `.ts`
- kebab-case for directories: `packages/ui/src/components/`, `apps/showcase/src/pages/`

**Functions:**
- camelCase for all function names: `mergeProps()`, `useRender()`, `cn()`, `useIsMobile()`
- React components use PascalCase: `Button`, `Tabs`, `Card`, `Accordion`
- No default exports; all functions/components exported as named exports

**Variables:**
- camelCase for all variable declarations: `buttonGroupVariants`, `className`, `orientation`, `isMobile`
- Exported constants use camelCase: `node` (ESLint config), `react` (ESLint config)

**Types:**
- PascalCase for all type names: `VariantProps`, `ComponentProps`, `TabsPrimitive.List.Props`
- Generic type parameters prefixed with `T` when used: `TItem` (rare in current codebase)
- Use `import type` syntax for type-only imports: `import type { VariantProps } from "class-variance-authority"`

## Code Style

**Formatting:**
- Prettier with configuration in `.prettierrc`: `{ "semi": false, "printWidth": 120 }`
- No semicolons at end of statements
- 120 character line width
- 2 spaces for indentation (implied by TypeScript/React standards, no .editorconfig detected)

**Linting:**
- ESLint 10.2.0 with flat config (`eslint.config.ts`) in root and `packages/eslint-config`
- Key rules:
  - `@typescript-eslint/consistent-type-imports`: error (enforces `import type` for type-only imports)
  - `perfectionist/sort-imports`: error (alphabetically sorts imports)
  - `prettier/prettier`: warn (integration with Prettier)
  - React-specific rules via `@eslint-react/eslint-plugin` and `eslint-plugin-react-hooks`
- No `.eslintrc.json` files; all config uses flat config format

## Import Organization

**Order:**
1. React and React DOM imports: `import * as React from "react"`, `import { useState } from "react"`
2. External library imports: `import { cva } from "class-variance-authority"`, `import { clsx } from "clsx"`
3. Internal path alias imports: `import { cn } from "@/lib/utils"`, `import { Button } from "@ui/components/button"`
4. Relative imports for co-located files: `import type { VariantProps } from "./button-variants"`

**Path Aliases:**
- `@ui` — maps to `packages/ui/src` (used in tests and internal component imports)
- `@monorepo-template/ui` — package export name for external consumers (used in `apps/showcase`)
- `@` — maps to `src` root in application projects (e.g., `apps/showcase/src`)

## Error Handling

**Patterns:**
- No explicit try-catch patterns found in component or utility code
- No Result types or error wrapper patterns
- Components assume props are valid; no runtime validation (relies on TypeScript compile-time type safety)
- Event handlers do not wrap async operations in error boundaries; errors propagate to top-level error handlers

## Logging

**Framework:** console (no dedicated logging framework detected)

**Patterns:**
- No logging calls found in component or utility code
- Logging reserved for development/debugging only; no production logging standards observed

## Comments

**When to Comment:**
- JSDoc comments for complex test suites (describe blocks in test files)
- Comments explaining configuration choices (e.g., `playwright.config.ts` comments)
- Minimal inline comments — code is expected to be self-documenting
- Avoid redundant comments that restate code functionality

**JSDoc/TSDoc:**
- Rarely used for source files; primarily used in test files for describe block documentation
- No TSDoc tags observed (e.g., @param, @returns) in current codebase

## Function Design

**Size:**
- Prefer smaller, focused functions (utilities like `cn()` are 3-5 lines)
- React components typically 10-50 lines (including JSX)
- Avoid large components; split into smaller sub-components when exceeding 50 lines

**Parameters:**
- Accept React.ComponentProps spreads for flexibility: `React.ComponentProps<"div">`, `TabsPrimitive.List.Props`
- Use destructuring with rest operator for props: `{ className, orientation, ...props }`
- Props grouped at end of parameters: `...props` always last

**Return Values:**
- JSX components return single JSX element
- Utility functions return typed values: `cn()` returns `string`
- No explicit return type annotations on React components (inferred by TypeScript)
- Explicit return types used for utility functions only when inference is unclear

## Module Design

**Exports:**
- Named exports only (no default exports per project guidelines)
- Multiple related functions/components exported together: `export { Button, ButtonGroup, buttonVariants }`
- No barrel file re-exports in component directories; top-level `packages/ui/src/index.ts` handles all public exports

**Barrel Files:**
- Top-level barrel file at `packages/ui/src/index.ts` re-exports all public components, hooks, and utilities
- Enables clean imports: `import { Button } from "@monorepo-template/ui"` or `import { Button } from "@monorepo-template/ui/components/button"`
- No nested barrel files in component subdirectories

---

*Convention analysis: 2026-05-05*
