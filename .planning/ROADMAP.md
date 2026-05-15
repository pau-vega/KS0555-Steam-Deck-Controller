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
| 20. Protocol & Domain | v2.2 | 0/? | Planned | — |
| 21. Gamepad Adapter & IPC | v2.2 | 0/? | Planned | — |
| 22. Frontend Hooks & UI | v2.2 | 0/? | Planned | — |
| 23. Docs + Meta-tests + Milestone Close | v2.2 | 0/? | Planned | — |

---

*Archives: [v2.0 ROADMAP](./milestones/v2.0-ROADMAP.md) · [v2.1 ROADMAP](./milestones/v2.1-ROADMAP.md)*
*Requirements: [v2.0](./milestones/v2.0-REQUIREMENTS.md) · [v2.1](./milestones/v2.1-REQUIREMENTS.md)*
