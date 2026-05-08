<!-- generated-by: gsd-doc-writer -->

# @ks0555/eslint-config

Shared ESLint flat configuration for the Steam Deck Robot Controller monorepo.

Part of the [KS0555 monorepo](../../README.md).

## Installation

This is a private workspace package. Install it in your workspace app or package:

```bash
pnpm add -D @ks0555/eslint-config
```

## Usage

This package exports two configuration objects: `node` (for TypeScript/Node targets) and `react` (for React + TypeScript projects).

### Node configuration

Use this in non-React TypeScript files:

```js
import nodeConfig from "@ks0555/eslint-config/dist/node.js"

export default [...nodeConfig]
```

**Includes:**

- TypeScript file parsing via `@typescript-eslint/parser`
- Import sorting via `eslint-plugin-perfectionist`
- Project-based type checking (reads `tsconfig.json`)
- Override for `*.config.ts` files (disables type checking for build configs)

### React configuration

Use this in React + TypeScript projects:

```js
import reactConfig from "@ks0555/eslint-config/dist/react.js"

export default [...reactConfig]
```

**Includes:**

- All node configuration rules
- React and React Hooks rules via `eslint-plugin-react` and `eslint-plugin-react-hooks`
- Global ignores for build artifacts (`dist/`, `target/`), minified files, and log files

## API

Both configurations export arrays of ESLint flat config objects (compatible with ESLint >= 9.0.0).

### node

TypeScript linting rules for backend code, CLI utilities, or non-UI code. Configures:

- Parser: `@typescript-eslint/parser` with TypeScript project loading
- Plugins: `eslint-plugin-perfectionist` for import sorting
- Rules: `perfectionist/sort-imports: error`

### react

Extends node rules with React-specific linting. Configures:

- All node rules
- Plugins: `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-perfectionist`
- Global ignores: build output, minified files, and log files

## Build

Build the distributable JavaScript:

```bash
pnpm --filter @ks0555/eslint-config build
```

Output is written to `dist/` as ES modules (`.js` files with TypeScript definition stubs).
