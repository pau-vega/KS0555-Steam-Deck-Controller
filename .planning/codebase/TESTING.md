# Testing Patterns

**Analysis Date:** 2026-05-05

## Test Framework

**Runner:**
- Vitest 4.1.4
- Config: `vitest.config.ts` (root-level, extends to workspace packages via pnpm workspaces)
- Environment: jsdom 29.0.2 (for React component testing)

**Assertion Library:**
- Built-in Vitest assertions (expect)
- @testing-library/jest-dom 6.9.1 (custom DOM matchers: `toBeInTheDocument()`, `toHaveClass()`)

**Run Commands:**
```bash
pnpm test              # Run all tests in watch mode
pnpm test:run          # Run all tests once
pnpm test:coverage    # Run tests with V8 coverage report
npx playwright test    # Run E2E tests (apps/showcase)
```

## Test File Organization

**Location:**
- Co-located with source files: `packages/ui/src/lib/utils.test.ts` alongside `utils.ts`
- Component tests live next to their component file: `packages/ui/src/components/button.test.tsx` alongside `button.tsx`

**Naming:**
- `.test.ts` for non-JSX files: `utils.test.ts`
- `.test.tsx` for React component tests: `button.test.tsx`
- No `.spec.ts` files detected in current codebase

**Structure:**
```
packages/ui/src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
├── components/
│   ├── button.tsx
│   └── button.test.tsx
└── hooks/
    ├── use-is-mobile.ts
    └── use-is-mobile.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges class names with clsx", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("deduplicates Tailwind classes with tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
```

**Patterns:**
- Setup: No global setup; tests initialize their own instances
- Teardown: Automatic teardown via Vitest (no afterEach/afterAll unless needed)
- Assertion pattern: Always use `expect()` with Vitest/jest-dom matchers

## Mocking

**Framework:** Vitest built-in `vi.mock()` and `vi.spyOn()`

**Patterns:**
```typescript
import { vi } from "vitest"
import { someExternalModule } from "external-lib"

vi.mock("external-lib", () => ({
  someExternalModule: vi.fn(),
}))

it("mocks external module", () => {
  someExternalModule()
  expect(someExternalModule).toHaveBeenCalled()
})
```

**What to Mock:**
- External modules with side effects (e.g., analytics, logging)
- Modules that make network requests or access browser APIs not supported in jsdom

**What NOT to Mock:**
- Internal utilities (e.g., `cn()` from `lib/utils`)
- React components and hooks from the same package
- @testing-library/react methods

## Fixtures and Factories

**Test Data:**
- Inline test data for simple cases
- No dedicated fixtures directory detected; complex test data defined in test files

**Location:**
- Test data co-located with test suites; no shared `__fixtures__` directory

## Coverage

**Requirements:** None enforced (no coverage threshold in vitest config)

**View Coverage:**
```bash
pnpm test:coverage    # Generates coverage report in /coverage directory
```

## Test Types

**Unit Tests:**
- Scope: Individual functions (e.g., `cn()`), React components (e.g., `Button`)
- Approach: Isolated testing with mocked dependencies; uses @testing-library/react for component rendering

**Integration Tests:**
- Scope: Component interactions (e.g., form with input and button)
- Approach: Render multiple components together; test user flows

**E2E Tests:**
- Framework: Playwright 1.59.1 (apps/showcase)
- Config: `apps/showcase/playwright.config.ts`
- Scope: Full page rendering, component showcase interactions, cross-browser testing

## Common Patterns

**Async Testing:**
```typescript
import { userEvent } from "@testing-library/user-event"

it("handles async click events", async () => {
  const user = userEvent.setup()
  render(<Button onClick={vi.fn()}>Click me</Button>)
  await user.click(screen.getByRole("button"))
})
```

**Error Testing:**
```typescript
it("throws error for invalid props", () => {
  expect(() => render(<Button orientation="invalid" />)).toThrow()
})
```

---

*Testing analysis: 2026-05-05*
