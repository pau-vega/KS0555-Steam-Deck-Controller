# Phase 14: Steam Deck On-Device Validation - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Sideload the single-file `.flatpak` on a real Steam Deck and empirically verify that BLE + gamepad work end-to-end in both Desktop Mode and Gaming Mode. Produce a reusable validation checklist, a dated test report with log snippets, and document the "Add as Non-Steam Game" workflow with Steam Input controller guidance. No application code changes — pure validation and documentation.
</domain>

<decisions>
## Implementation Decisions

### Validation Checklist (Reusable)
- **D-01:** Formal pass/fail checklist written as `flatpak/VALIDATION-CHECKLIST.md` — reusable across future releases.
- **D-02:** Explicit precondition checks: Flatpak version, SteamOS version, BT24 robot powered on, Bluetooth enabled.
- **D-03:** Each checklist step annotated with its req-ID (DECK-01 through DECK-04, VAL-09).
- **D-04:** Checklist produces a dated report artifact in `flatpak/validation-reports/YYYY-MM-DD-REPORT.md` — not inline fill.
- **D-05:** Tests covered: install, Desktop Mode launch + BLE + gamepad, BLE reconnect (disconnect/reconnect robot), rapid direction changes (F→B→L→R sequence), explicit S (stop) command, Non-Steam Game picker, Gaming Mode launch, full round-trip (Desktop → Gaming → Desktop), offline mode (no BT24 nearby), full UI validation (StatusBar states, ControlPad buttons).
- **D-06:** Latency noted qualitatively (immediate/slight lag/noticeable delay) per step — no strict ms thresholds.
- **D-07:** No Steam Deck hardware-specific checks — app-only validation focus.

### Log Artifacts
- **D-08:** Capture app-level logs only (no dbus-monitor or journalctl): `flatpak run --env=RUST_LOG=debug com.ks0555.robotcontroller 2> validation-logs/YYYY-MM-DD-app.log`.
- **D-09:** Key log snippets embedded in the test report — no full raw logs committed to repo.
- **D-10:** Include `env` dump inside sandbox (`flatpak run --command=env`) to verify `WEBKIT_DISABLE_COMPOSITING_MODE=1` is active.

### Gaming Mode Protocol
- **D-11:** Structured escalation: add as Non-Steam Game in Desktop → switch to Gaming → launch → if black screen, try env workarounds → if persists, capture env + GPU info and document.
- **D-12:** Test Steam Input both enabled (default) and with a gamepad-pass-through configuration — document which works.
- **D-13:** Always document a recommended Steam Input controller template (e.g. "Gamepad with Joystick Trackpad", "Keyboard (WASD) and Mouse") — not only if default breaks.
- **D-14:** Full Desktop Mode → Gaming Mode → Desktop Mode round-trip tested.

### Failure Handling
- **D-15:** If `--device=input` fails, proactively test `--device=all` fallback and document which Flatpak/SteamOS version needs which.
- **D-16:** BLE failing in Gaming Mode (works in Desktop) → document as known limitation with troubleshooting note — not blocking.
- **D-17:** Flatpak install failure → retry with `--verbose`, capture error output, include fix in report.
- **D-18:** Persistent black screen in Gaming Mode → try known workarounds (double env, fallback-x11-only), document working combo — not blocking.

### the agent's Discretion
- Exact format and indentation of VALIDATION-CHECKLIST.md (markdown table or task-list style).
- Exact structure of the validation report template.
- Steam Input template name and documentation phrasing.
- Shell commands for log capture in the checklist.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Goal
- `.planning/REQUIREMENTS.md` — DECK-01 through DECK-04, VAL-09 (on-device validation requirements)
- `.planning/ROADMAP.md` § Phase 14 — Goal, 5 success criteria, dependencies (Phase 13)

### Prior Phase Context (locked decisions)
- `.planning/phases/13-sandbox-permissions-ble-gamepad/13-CONTEXT.md` — BLE finish-args, gamepad `--device=input`, `--device=all` fallback, `in_flatpak()` gate, anti-feature checklist
- `.planning/phases/12-manifest-appstream-local-build/12-CONTEXT.md` — Display finish-args, WEBKIT env var in manifest, deb-extract pattern
- `.planning/phases/11-bundle-pipeline-restructure/11-CONTEXT.md` — Flatpak runtime `org.freedesktop.Platform//24.08` locked (D-07, D-08)

### Source Files Validated (Read-Only)
- `flatpak/com.ks0555.robotcontroller.yaml` — Flatpak manifest with all finish-args from Phases 12-13
- `apps/frontend/src-tauri/src/lib.rs` — `in_flatpak()` gate, D-Bus rewrite, WEBKIT set_var
- `apps/frontend/src-tauri/src/ble/mod.rs` — BLE connection logic (validated, not changed)
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — Gamepad logic (validated, not changed)
- `apps/frontend/src-tauri/tauri.conf.json` — Identifier `com.ks0555.robotcontroller`, version `0.1.5`

### Code That Must Not Change
- `apps/frontend/src/app.tsx` — VAL-08 lock holds across v2.1
- `apps/frontend/src/components/control-pad.tsx` — Locked
- `apps/frontend/src/components/status-bar.tsx` — Locked
- `apps/frontend/src-tauri/src/ble/mod.rs` — No BLE logic changes
- `apps/frontend/src-tauri/src/gamepad/mod.rs` — No gamepad logic changes

### Research & Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 4 (`--device=input` requires Flatpak ≥ 1.15.6), Pitfall 7 (sideload bundles do not auto-update)
- `.planning/PROJECT.md` § Key Decisions — Flatpak runtime, sideload-only distribution

### External Specifications
- [Flatpak Sandbox Permissions Reference](https://docs.flatpak.org/en/latest/sandbox-permissions-reference.html) — `--device=input` vs `--device=all`
- [Flatpak Command Reference](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) — `flatpak install --verbose`, `flatpak run --env=`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flatpak/com.ks0555.robotcontroller.yaml` — Flatpak manifest with all finish-args. The manifest is the artifact being validated.
- `flatpak/build.sh` — Build script. If validation passes, build.sh output is what gets deployed.
- `flatpak/VALIDATION-CHECKLIST.md` — To be created this phase as a reusable validation protocol.

### Established Patterns
- Belt-and-suspenders: WEBKIT_DISABLE_COMPOSITING_MODE in both manifest and Rust code (Phase 12). Validation verifies both paths work under Gamescope.
- Phased finish-args: Display args in Phase 12, BLE+gamepad args in Phase 13. Validation verifies they all work together on real hardware.
- Manual hardware checklist: Phase 13 established manual validation for VAL-06/VAL-07. Phase 14 extends to the full Deck workflow.

### Integration Points
- `flatpak/` directory is the integration point between build and deployment. Validation exercises the entire pipeline: build → bundle → transfer → install → run.
- `flatpak/com.ks0555.robotcontroller.desktop` export path is the integration point between Flatpak and Steam's "Add Non-Steam Game" picker.
- No cross-module code changes — this phase validates existing code in the Flatpak sandbox context.
</code_context>

<specifics>
## Specific Ideas

- Checklist format: reusable markdown with `- [ ] PASS / [ ] FAIL` per step, req-ID annotation in parens, precondition section at top.
- Report format: copy of checklist with `[x]` markers, date, tester name, Flatpak build version, and appended log snippet section.
- Gaming Mode launch command to add: `flatpak run com.ks0555.robotcontroller` — the Non-Steam Game shortcut targets `/usr/bin/flatpak run com.ks0555.robotcontroller`.
- Steam Input template should be part of the Deck setup docs (Phase 16 DOCS-01), but template recommendation captured here.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 14 scope.
</deferred>

---

*Phase: 14-Steam Deck On-Device Validation*
*Context gathered: 2026-05-09*
