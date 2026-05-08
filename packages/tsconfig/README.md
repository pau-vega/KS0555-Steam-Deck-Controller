<!-- generated-by: gsd-doc-writer -->

# @ks0555/tsconfig

Shared TypeScript compiler configuration for the KS0555 Steam Deck Robot Controller monorepo.

Part of the [KS0555 Steam Deck Robot Controller](../../README.md) monorepo.

## Installation

```bash
pnpm install -D @ks0555/tsconfig
```

## Usage

This package exports three base configurations:

- **`tsconfig.json`** — Base configuration for all TypeScript projects. Enforces strict type checking, ESM modules, and modern JavaScript targets (ES2022). Includes `noUncheckedIndexedAccess` for safer array/object indexing.
- **`tsconfig.node.json`** — For Node.js backend projects (build tools, Tauri shell, etc.). Extends the base, adds `declaration: true` and `outDir: "dist"` / `rootDir: "src"`.
- **`tsconfig.react.json`** — For React frontend projects. Extends the base, adds JSX support (`react-jsx` mode) and DOM type libraries.

## Extending in Your Package

In your package's `tsconfig.json`, extend the appropriate base:

```json
{
  "extends": "@ks0555/tsconfig/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

Or for a Node.js / library project:

```json
{
  "extends": "@ks0555/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Or for a React component library:

```json
{
  "extends": "@ks0555/tsconfig/tsconfig.react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Configuration Details

| Setting                    | Base    | Node    | React                     | Purpose                             |
| -------------------------- | ------- | ------- | ------------------------- | ----------------------------------- |
| `target`                   | ES2022  | ES2022  | ES2022                    | Compile to modern JavaScript        |
| `module`                   | ESNext  | ESNext  | ESNext                    | Support tree-shaking in bundlers    |
| `moduleResolution`         | bundler | bundler | bundler                   | Resolve modules the way bundlers do |
| `strict`                   | true    | true    | true                      | Enable all strict type checks       |
| `noUncheckedIndexedAccess` | true    | true    | true                      | Require index access guard checks   |
| `jsx`                      | —       | —       | react-jsx                 | JSX support (React 17+)             |
| `lib`                      | —       | ES2022  | ES2022, DOM, DOM.Iterable | Include type definitions            |

## Rules & Conventions

See [`.agents/rules/typescript.md`](../../.agents/rules/typescript.md) for the full set of TypeScript conventions used in this monorepo (no default exports, discriminated unions, Result types, `import type` imports, etc.).
