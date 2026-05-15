# Roadmap: Steam Deck Robot Controller

## Milestones

- ✅ **v2.0 Tauri Migration** — Phases 6-10 (shipped 2026-05-12)
- ✅ **v2.1 Flatpak Packaging** — Phases 11-19 (shipped 2026-05-12)
- 📋 **v2.2 Analog Speed Control** — Phases 20-23 (planned, 2026-05-15)
- 📋 **v2.3+ Future** — Backlog (Pipeline polish, auto-reconnect, Flathub prep)

## Phases

<details>
<summary>✅ v2.0 Tauri Migration (Phases 6-10) — SHIPPED 2026-05-12</summary>

- [x] Phase 6: Tauri Shell Setup (2/2 plans) — completed 2026-05-06
- [x] Phase 7: BLE Commands with btleplug (3/3 plans) — completed 2026-05-06
- [x] Phase 8: Gamepad Monitoring with gilrs (3/3 plans) — completed 2026-05-06
- [x] Phase 9: Hook Rewrites (2/2 plans) — completed 2026-05-06
- [x] Phase 10: Build and Test on SteamOS (2/2 plans) — completed 2026-05-06

</details>

<details>
<summary>✅ v2.1 Flatpak Packaging (Phases 11-19) — SHIPPED 2026-05-12</summary>

- [x] Phase 11: Bundle Pipeline Restructure (3/3 plans) — completed 2026-05-09
- [x] Phase 12: Manifest + AppStream + Local Build (2/2 plans) — completed 2026-05-09
- [x] Phase 13: Sandbox Permissions for BLE + Gamepad (1/1 plan) — completed 2026-05-09
- [x] Phase 14: Steam Deck On-Device Validation (1/1 plan) — completed 2026-05-09
- [x] Phase 15: CI Migration (Parallel-Run) (2/2 plans) — completed 2026-05-10
- [x] Phase 16: AppImage Decommission + Upgrade Workflow Docs (3/3 plans) — completed 2026-05-10
- [x] Phase 17: Close Verification Gaps (1/1 plan) — completed 2026-05-10
- [x] Phase 18: Fix Stale Docs (1/1 plan) — completed 2026-05-10
- [x] Phase 19: Execute Deb Build + Flatpak Runner (1/1 plan) — completed 2026-05-12

</details>

<details open>
<summary>📋 v2.2 Analog Speed Control (Phases 20-23) — PLANNED 2026-05-15</summary>

- [ ] Phase 20: Protocol & Domain — `Command` type, `quantize_pressure`, expand `compute_trigger`/`compute_stick_direction`, relax `ble_send` validation. Pure-Rust + tests. (REQ-SPD-01..06 partial)
- [ ] Phase 21: Gamepad Adapter & IPC — emit `(direction, pwm)` from `gilrs_adapter`, coalesce on `(dir, pwm_bucket)`, update mock-port behavioral tests. (REQ-SPD-04..08)
- [ ] Phase 22: Frontend Hooks & UI — add `Command` type, additive `lastCommand` on `useGamepad`, `useBluetooth.send` accepts `Command`, passive speed indicator on `control-pad.tsx`. (REQ-SPD-09..11)
- [ ] Phase 23: Docs + Meta-tests + Milestone Close — update AGENTS.md, ARCHITECTURE.md, meta-tests; record retrospective. (REQ-SPD-12..14)

Out of scope this milestone: right-stick mapping, smoothing curves, user-tunable presets, firmware changes.
Deferred follow-up: REQ-SPD-15 hardware smoke test (rolls into VAL-09).

### Phase 20: Protocol & Domain

**Goal**: Land the analog wire protocol in pure Rust — `Command` enum with `Display` serializing to `<dir><pwm>\n` / `S\n`, `quantize_pressure` 10-bucket function, expanded `compute_trigger` / `compute_stick_direction` returning `Command`, and relaxed `ble_send` payload validation. All changes covered by unit tests; no adapter wiring yet.
**Depends on**: Phase 19 (v2.1 shipped)
**Requirements**: REQ-SPD-01, REQ-SPD-02, REQ-SPD-03, REQ-SPD-04, REQ-SPD-05 (REQ-SPD-06 partial — only the domain-side signatures consumed by `gilrs_adapter` land here; the adapter rewrite is Phase 21)

**Scope**:
- `apps/frontend/src-tauri/src/domain/direction.rs` — add `Command` enum, `quantize_pressure`, update `compute_trigger` and `compute_stick_direction` signatures + behavior.
- `apps/frontend/src-tauri/src/ble/mod.rs` — drop `len == 1` validation, accept `^[FBLR]\d{2,3}\n$ | ^S\n$`, pass through to `BluetoothPort::write` unchanged.
- Unit tests for `quantize_pressure` (deadzone, monotonicity, bucket boundaries, clamping), `compute_trigger` (R2/L2/tie/below-deadzone), `compute_stick_direction` (deadzone, axis tiebreak, magnitude→pwm), `Command::Display` (wire format), `ble_send` regex (accept/reject).

**Out of scope (Phase 20)**: `gilrs_adapter.rs` rewrite, IPC payload changes, frontend types/hooks, docs.

**Success Criteria**:
1. `cargo test --manifest-path apps/frontend/src-tauri/Cargo.toml` passes
2. `quantize_pressure` covers deadzone, all 10 buckets, and clamping; tests assert monotonicity
3. `compute_trigger` returns `Command` covering R2-wins/L2/tie/below-deadzone
4. `compute_stick_direction` returns `Command` covering deadzone/axis-tiebreak/magnitude
5. `ble_send` rejects malformed payloads (no newline, wrong direction char, pwm out of range) and accepts the new wire format
6. No changes to `gilrs_adapter.rs` IPC contract in this phase
7. `cargo clippy` and `cargo fmt --check` clean for touched files

**Plans:** 3 plans (planned 2026-05-15)
- [x] 20-01-domain-types-PLAN.md — `Command` enum + `Display` impl, `quantize_pressure` pure function, plus unit tests (REQ-SPD-01, REQ-SPD-02). Wave 1.
- [ ] 20-02-gamepad-domain-functions-PLAN.md — `compute_trigger_command` and `compute_stick_command` added alongside legacy functions; tests cover R2-wins-tie, axis tiebreak, NaN safety, magnitude clamping (REQ-SPD-04, REQ-SPD-05, REQ-SPD-06 partial). Wave 2.
- [x] 20-03-ble-send-validation-PLAN.md — relax `ble_send` to accept `^[FBLR]\d{2,3}\n$ | ^S\n$` with pwm range check, regex compiled once, 18 accept/reject tests (REQ-SPD-03). Wave 1.

### Phase 21: Gamepad Adapter & IPC

**Goal**: Wire the new `Command`-producing domain functions into `gilrs_adapter`, coalesce on `(dir, pwm_bucket)`, and update the `gamepad-direction` IPC payload + `ble_send` command shape. Mock-port behavioral tests updated.
**Depends on**: Phase 20
**Requirements**: REQ-SPD-04, REQ-SPD-05, REQ-SPD-06, REQ-SPD-07, REQ-SPD-08

### Phase 22: Frontend Hooks & UI

**Goal**: Add `Command` type to `apps/frontend/src/types.ts`, make `useBluetooth.send` accept `Command` (with legacy `Direction`-only overload defaulting PWM to 150), expose passive speed state through `useGamepad`, render a `SpeedIndicator` row beneath the d-pad in `control-pad.tsx`. Hook return shapes additive-only per AGENTS.md contract.
**Depends on**: Phase 21
**Requirements**: REQ-SPD-09, REQ-SPD-10, REQ-SPD-11

### Phase 23: Docs + Meta-tests + Milestone Close

**Goal**: Update AGENTS.md IPC contract table and remove "firmware immutable" claim, rewrite `docs/ARCHITECTURE.md` BLE-write section for the new wire format, refresh meta-tests under `apps/frontend/src/` that pattern-match the old 5-char protocol, record the v2.2 retrospective.
**Depends on**: Phase 22
**Requirements**: REQ-SPD-12, REQ-SPD-13, REQ-SPD-14

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 6. Tauri Shell Setup | v2.0 | 2/2 | Complete | 2026-05-06 |
| 7. BLE Commands with btleplug | v2.0 | 3/3 | Complete | 2026-05-06 |
| 8. Gamepad Monitoring with gilrs | v2.0 | 3/3 | Complete | 2026-05-06 |
| 9. Hook Rewrites | v2.0 | 2/2 | Complete | 2026-05-06 |
| 10. Build and Test on SteamOS | v2.0 | 2/2 | Complete | 2026-05-06 |
| 11. Bundle Pipeline Restructure | v2.1 | 3/3 | Complete | 2026-05-09 |
| 12. Manifest + AppStream + Local Build | v2.1 | 2/2 | Complete | 2026-05-09 |
| 13. Sandbox Permissions for BLE + Gamepad | v2.1 | 1/1 | Complete | 2026-05-09 |
| 14. Steam Deck On-Device Validation | v2.1 | 1/1 | Complete | 2026-05-09 |
| 15. CI Migration (Parallel-Run) | v2.1 | 2/2 | Complete | 2026-05-10 |
| 16. AppImage Decommission + Upgrade Workflow Docs | v2.1 | 3/3 | Complete | 2026-05-10 |
| 17. Close Verification Gaps | v2.1 | 1/1 | Complete | 2026-05-10 |
| 18. Fix Stale Docs | v2.1 | 1/1 | Complete | 2026-05-10 |
| 19. Execute Deb Build + Flatpak Runner | v2.1 | 1/1 | Complete | 2026-05-12 |
| 20. Protocol & Domain | v2.2 | 2/3 | In Progress|  |
| 21. Gamepad Adapter & IPC | v2.2 | 0/? | Planned | — |
| 22. Frontend Hooks & UI | v2.2 | 0/? | Planned | — |
| 23. Docs + Meta-tests + Milestone Close | v2.2 | 0/? | Planned | — |

---

*Archives: [v2.0 ROADMAP](./milestones/v2.0-ROADMAP.md) · [v2.1 ROADMAP](./milestones/v2.1-ROADMAP.md)*
*Requirements: [v2.0](./milestones/v2.0-REQUIREMENTS.md) · [v2.1](./milestones/v2.1-REQUIREMENTS.md)*
