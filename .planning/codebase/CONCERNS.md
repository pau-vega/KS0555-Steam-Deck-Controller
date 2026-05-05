# Codebase Concerns

**Analysis Date:** 2026-05-05

## Tech Debt

### TypeScript 5.9.3 to 6.x Migration Pending
- Issue: Codebase currently uses TypeScript 5.9.3; project goal is to migrate to TypeScript 6.x to address deprecations before they become errors in TS7, and stay on the latest compiler.
- Files: `package.json` (root, `packages/ui`, `packages/eslint-config`, `packages/tsconfig`), `tsconfig.base.json`
- Impact: Deprecated TypeScript patterns may cause build failures when TS7 releases; blocks compliance with project's "no deprecation warnings" constraint.
- Fix approach: Update TypeScript version to 6.x in all workspace package.json files, run `pnpm typecheck` across all workspaces, resolve deprecation warnings, verify all packages build successfully.

### No Runtime Prop Validation
- Issue: All UI components rely solely on TypeScript for prop validation; no runtime checks are implemented. Invalid props from consumers will cause silent failures or runtime errors.
- Files: All components in `packages/ui/src/components/`
- Impact: Consumers passing malformed props may encounter unexplained UI issues or crashes without clear error messaging.
- Fix approach: Add lightweight runtime prop validation for public component APIs using a library like Zod, or re-add React PropTypes for development-only checks.

### Shared ESLint Config Overhead
- Issue: `packages/eslint-config` bundles Node and React rules into a single flat config, which may include redundant rules or cause conflicts for non-React packages.
- Files: `packages/eslint-config/eslint.config.ts`
- Impact: Linting errors may be difficult to debug; inconsistent rule enforcement across workspace packages.
- Fix approach: Audit ESLint config, split into discrete presets (e.g., `eslint-config-node`, `eslint-config-react`) if needed, remove unused rules.

## Known Bugs

### None detected
- No confirmed bugs found in current codebase exploration. TODO/FIXME comment scan returned no critical issues.

## Security Considerations

### Missing Content Security Policy (CSP)
- Risk: `apps/showcase` has no CSP configuration, leaving it vulnerable to XSS attacks if malicious content is injected.
- Files: `apps/showcase/index.html`, `apps/showcase/vite.config.ts`
- Current mitigation: None
- Recommendations: Add CSP meta tag for development, configure CSP headers in Vite for production builds.

### No Secret Management Pipeline
- Risk: While no secrets are currently used, future integrations with external APIs (e.g., analytics, CMS) will require secure secret handling.
- Files: N/A (current state)
- Current mitigation: No external services with secrets are integrated.
- Recommendations: Add `.env` validation with Zod when external services are introduced; avoid committing secrets to git.

## Performance Bottlenecks

### Unoptimized Component Re-renders
- Problem: Complex UI components (e.g., `Command`, `DataTable`, `Tabs`) may not use `React.memo`, `useMemo`, or `useCallback` consistently, leading to unnecessary re-renders.
- Files: `packages/ui/src/components/command.tsx`, `packages/ui/src/components/data-table.tsx`, `packages/ui/src/components/tabs.tsx`
- Cause: Missing memoization for expensive components or callback props passed to child components.
- Improvement path: Audit high-traffic components for re-render issues using React DevTools; add memoization where needed.

## Fragile Areas

### Monorepo Dependency Management
- Files: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, all `package.json` files in workspace roots
- Why fragile: pnpm's strict peer dependency and `dedupePeerDependents: true` settings may cause unexpected breaking changes when updating deep dependencies.
- Safe modification: Run full test suite (`pnpm test`) and build (`pnpm build`) across all workspaces after any dependency update; use `pnpm dedupe` regularly to resolve peer dependency conflicts.
- Test coverage: Partial — integration tests exist for showcase app, but no automated tests for dependency compatibility.

### CVA Variant + Tailwind Class Merging
- Files: All components in `packages/ui/src/components/` that use `cva` (e.g., `button.tsx`, `badge.tsx`, `alert.tsx`)
- Why fragile: Class Variance Authority (CVA) variants may conflict with Tailwind classes if not merged correctly via the `cn()` utility; edge cases in class merging may cause style regressions.
- Safe modification: Test all variant combinations when modifying component styles; always use `cn()` for class merging instead of string concatenation.
- Test coverage: Low — no visual regression tests for component variants.

## Scaling Limits

### UI Component Library Growth
- Current capacity: 50+ components in `packages/ui/src/components/`
- Limit: As component count grows, tsup build times and tree-shaking efficiency may degrade; documentation and discoverability will suffer.
- Scaling path: Enforce consistent subpath exports in `packages/ui/package.json`; audit unused/redundant components quarterly; consider component grouping or code splitting for large primitives.

## Dependencies at Risk

### @base-ui/react 1.4.0
- Risk: Headless UI library; if maintenance stalls or a major version update introduces breaking changes, all UI components in `packages/ui` will require updates.
- Impact: 50+ components depend on @base-ui/react primitives for accessibility and behavior.
- Migration plan: Monitor @base-ui/react release notes; run full component test suite before upgrading versions.

### TypeScript 5.9.3
- Risk: Deprecated version, will no longer receive security patches or bug fixes; TypeScript 6.x+ may introduce breaking changes for deprecated patterns.
- Impact: Entire codebase depends on TypeScript for typechecking and builds.
- Migration plan: Complete TypeScript 6.x migration as the project's primary current milestone.

## Missing Critical Features

### Visual Regression Testing
- Problem: No visual regression tests exist for UI components; unintended style changes may go unnoticed during development.
- Blocks: Ensuring consistent component appearance across refactors, dependency updates, and new feature work.
- Fix approach: Integrate a visual regression tool like Percy or Playwright's screenshot testing into the E2E test suite.

### Automated Accessibility Testing
- Problem: No automated accessibility (a11y) checks for UI components; @base-ui/react provides accessible primitives, but custom styling may introduce a11y regressions.
- Blocks: Ensuring compliance with WCAG standards for all components.
- Fix approach: Add axe-core to Vitest or Playwright test suites; run automated a11y checks on all component examples.

## Test Coverage Gaps

### UI Component Unit Tests
- What's not tested: The majority of components in `packages/ui/src/components/` lack dedicated unit tests; only the showcase app has E2E tests via Playwright.
- Files: `packages/ui/src/components/*`
- Risk: Component logic regressions may not be caught until manual testing or E2E runs.
- Priority: High

### Utility & Hook Tests
- What's not tested: Shared utilities (`cn()` in `packages/ui/src/lib/utils.ts`) and custom hooks (`useIsMobile()` in `packages/ui/src/hooks/useIsMobile.ts`) have minimal or no unit tests.
- Files: `packages/ui/src/lib/utils.ts`, `packages/ui/src/hooks/useIsMobile.ts`
- Risk: Bugs in shared utilities or hooks will propagate to all consuming components.
- Priority: Medium

### Error Handling Tests
- What's not tested: No tests validate error states for components (e.g., async component failures, invalid prop handling).
- Files: `packages/ui/src/components/*`
- Risk: Error states may be unhandled or display incorrectly in production.
- Priority: Medium

---

*Concerns audit: 2026-05-05*
