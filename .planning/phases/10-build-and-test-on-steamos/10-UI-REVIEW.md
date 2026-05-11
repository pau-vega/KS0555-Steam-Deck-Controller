# Phase 10 — UI Review

**Audited:** 2026-05-06
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md for this phase)
**Screenshots:** Not captured — Tauri desktop app; no browser-accessible React route; code-only audit

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Direction labels (`F`/`B`/`L`/`R`/`S`) opaque; CTA copy is specific and action-oriented |
| 2. Visuals | 2/4 | `.app` container has zero CSS rules — layout is accidental browser defaults, not designed |
| 3. Color | 3/4 | `bg-yellow-600`, `text-gray-400`, `#eee` bypass design token system |
| 4. Typography | 4/4 | 4 sizes, 2 weights, system UI font stack — clean and minimal |
| 5. Spacing | 3/4 | Inner components properly spaced; outer `.app` container has no gap or padding |
| 6. Experience Design | 2/4 | BLE errors silently swallowed; no ErrorBoundary |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **BLE connection failure silently swallowed** — Users see status flip back to "✗ Bluetooth" with no explanation when BLE fails. `app.tsx:38` calls `void connect()` discarding the rejection. Fix: `.catch(err => setConnectionError(String(err)))` and render error below connect button.

2. **`.app` container div undefined** — `app.tsx:32` uses `className="app"` but `.app` has zero CSS rules in any file. All children spacing relies on browser block-flow defaults which differ between Steam Deck WebKit and Chromium. Fix: replace with `className="flex flex-col items-center gap-6 p-8 w-full max-w-sm"`.

3. **Control pad buttons have no `aria-label`** — `control-pad.tsx:4-8` BUTTONS array uses symbol-only labels (`▲`, `◀`, `■`, `▶`, `▼`). Screen readers announce Unicode codepoint names. Fix: add `aria-label` to each entry (e.g., `aria-label: "Forward"`) and pass it to `<button>`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

No generic Submit/Cancel/OK strings. BLE button copy `"Connecting..."` / `"Connect Bluetooth"` is specific.

- `app.tsx:49` — Raw direction letter `S` not self-explanatory as "Stop". `"Current direction: S"` fails clarity bar.
- `app.tsx:45-51` — "Last command" and "Current direction" panels are near-identical and redundant — same value during active use, no authoritative distinction.
- `control-pad.tsx:6` — Stop button `■` is correct convention but unlabeled (see Pillar 6).

### Pillar 2: Visuals (2/4)

- **WARNING** `app.tsx:32` — `.app` class not defined in `index.css` or any CSS file. Layout is accidental. Children stack on browser block-flow defaults — no gap, no padding, no max-width. Visually inconsistent across WebKit versions.
- `control-pad.tsx:18` — 3×3 grid has 4 vacant corner cells with no visual affordance explaining the spatial structure. A subtle grid border would help.
- No visual hierarchy beyond `h1`. Connection state (disconnected/connected) carries equal visual weight to telemetry readouts. No focal point draws eye to primary CTA when disconnected.

### Pillar 3: Color (3/4)

Accent usage is intentional and scoped (5 elements: primary CTA bg, last-command value, direction value, hover state, stop border). 60/30/10 split is approximately met.

- `status-bar.tsx:17` — `bg-yellow-600 text-yellow-100` bypasses token system. No `--color-connecting` token defined. Fix: add token to `@theme` and use semantic class.
- `app.tsx:49` — `text-gray-400` is a hardcoded Tailwind gray, not a token. Fix: define `--color-muted: #9ca3af` in `@theme`.
- `index.css:19` — `color: #eee` on `body` is raw hex alongside token-defined colors. Fix: route through `--color-text` token.

### Pillar 4: Typography (4/4)

- Sizes: `text-sm`, `text-lg`, `text-xl`, `text-2xl` — 4 total, within guideline.
- Weights: `font-medium`, `font-bold` — 2 total, within guideline.
- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — appropriate for SteamOS desktop.
- Pairings semantically consistent: `font-bold` for live data values, `font-medium` for interactive labels.

### Pillar 5: Spacing (3/4)

No arbitrary `[...px]` or `[...rem]` values. All spacing uses Tailwind scale classes.

- Values in use: `p-3`, `px-3`, `px-6`, `py-1`, `py-3`, `gap-2`, `gap-4` — tight set, no scale violations.
- Inner components properly spaced: `status-bar.tsx:11` `flex gap-4`, `control-pad.tsx:18` `gap-2`, `app.tsx:45` `p-3`.
- **WARNING** Outer `.app` container has no vertical gap or padding (see Pillar 2). Sibling separation relies on browser default block margins from `<h1>` and button elements — uncontrolled.
- `app.tsx:37` connect button `px-6 py-3` — adequate touch target for gamepad operation.

### Pillar 6: Experience Design (2/4)

Three-state model (disconnected/connecting/connected) is fully implemented. Disabled states correctly propagated to ControlPad.

- **BLOCKER** `app.tsx:38` — `void connect()` silently discards Promise rejection. `use-bluetooth.ts:11-18` re-throws errors after state reset. Users see status reset to disconnected with no explanation. On SteamOS where BLE daemon may be unavailable or permissions denied, this is a common failure path. Fix: `.catch(err => setConnectionError(String(err)))` + render error state.
- **BLOCKER** No `ErrorBoundary` anywhere in codebase. If `useBluetooth`'s `setup()` async `useEffect` throws (e.g., `listen()` rejects because Tauri IPC unavailable), React shows a blank screen. Fix: add top-level ErrorBoundary in `main.tsx`.
- Connecting state handled: button disabled during `connecting`, StatusBar shows `"⟳ Connecting..."` with `bg-yellow-600`.
- Disabled state: `control-pad.tsx:23-28` applies `opacity-40 cursor-not-allowed` + native `disabled` when `bleConnected` is false.
- No empty states needed (UI always fully rendered).
- No destructive actions — confirmation dialog not applicable.

---

## Registry Safety

`components.json` not found. Shadcn not initialized. Registry audit skipped.

---

## Files Audited

- `apps/frontend/src/app.tsx`
- `apps/frontend/src/main.tsx`
- `apps/frontend/src/index.css`
- `apps/frontend/src/components/control-pad.tsx`
- `apps/frontend/src/components/status-bar.tsx`
- `.planning/phases/10-build-and-test-on-steamos/10-01-SUMMARY.md`
- `.planning/phases/10-build-and-test-on-steamos/10-02-SUMMARY.md`
- `.planning/phases/10-build-and-test-on-steamos/10-01-PLAN.md`
- `.planning/phases/10-build-and-test-on-steamos/10-02-PLAN.md`
- `.planning/phases/10-build-and-test-on-steamos/10-CONTEXT.md`
