# Phase 14: Steam Deck On-Device Validation — Research

**Researched:** 2026-05-09
**Scope:** Real Steam Deck validation of a sideloaded Flatpak bundle with BLE + gamepad end-to-end in Desktop and Gaming Mode
**Confidence:** HIGH for Flatpak sandbox semantics (official docs, already exercised in Phases 12-13), MEDIUM for Gaming Mode behavior (Gamescope + WebKitGTK interaction is empirical per-Deck), MEDIUM for Steam Input configuration (depends on SteamOS channel)

---

## What Is Being Validated

Phase 14 validates the **output of Phases 11-13**: a single-file `.flatpak` bundle produced by `flatpak/build.sh` that:

| Component | File | Status | Phase Built |
|-----------|------|--------|-------------|
| Flatpak manifest | `flatpak/com.ks0555.robotcontroller.yaml` | Complete | 12, hardened 13 |
| Build script | `flatpak/build.sh` | Complete | 12 |
| Icons + AppStream | `flatpak/icons/`, `flatpak/*.metainfo.xml` | Complete | 12 |
| in_flatpak() D-Bus gate | `apps/frontend/src-tauri/src/lib.rs` | Complete | 13 |
| BLE finish-args | `--system-talk-name=org.bluez`, etc. | Complete | 13 |
| Gamepad finish-args | `--device=input` (+ `--device=all` fallback) | Complete | 13 |
| WEBKIT env var | Belt-and-suspenders (manifest + Rust) | Complete | 12 (manifest), 13 (lib.rs) |
| Anti-feature checklist | Comment block in manifest | Complete | 13 |

**No code changes are permitted** — this is pure validation and documentation.

## Validation Architecture

### The System Under Test

The Flatpak sandbox layers on the Steam Deck:

```
Steam Deck Hardware
  └─ SteamOS (Arch-based, x86_64)
       └─ Flatpak >= 1.14.x (version varies by SteamOS channel)
            └─ bwrap sandbox
                 └─ org.freedesktop.Platform//24.08 runtime
                      ├─ WebKitGTK (renders Tauri webview)
                      ├─ btleplug → BlueZ over D-Bus proxy
                      ├─ gilrs → /dev/input/event* (if --device=input)
                      └─ robot-controller binary (from deb-extract)
```

### Trust Boundaries (for threat model)

| Boundary | Description |
|----------|-------------|
| Host → Flatpak sandbox | finish-args defines what host resources the app can access |
| Flatpak → BlueZ (D-Bus) | `--system-talk-name=org.bluez` grants system-bus access for BLE |
| Flatpak → /dev/input | `--device=input` grants gamepad evdev access |
| Flatpak → Display | `--socket=wayland`/`fallback-x11` + `--device=dri` for GPU |
| Steam Gaming Mode → Flatpak | Gamescope compositor wraps the Flatpak session |
| Steam Input → Flatpak app | Steam may intercept or pass-through gamepad input |

### What Can Fail (and How to Detect It)

**Uncovered pitfall from research — critical to validate:**

The PITFALLS.md documents 13 known risks. Phases 12-13 addressed all code-level mitigations. Phase 14 empirically verifies those mitigations work on real hardware. Here's what to look for:

| Pitfall | Status | How to Detect on Real Deck |
|---------|--------|---------------------------|
| Pitfall 2: BLE silently fails without `--system-talk-name` | ✓ Mitigated (Phase 13 finish-args) | `flatpak run` must scan and connect to BT24 |
| Pitfall 4: gilrs can't see `/dev/input/event*` without `--device=input` | ✓ Mitigated (Phase 13) | Gamepad direction events must fire on Steam Deck built-in controller |
| Pitfall 5: WebKit compositing fails in Gaming Mode | ✓ Mitigated (belt-and-suspenders env var) | Window must render (not black/white) in Gaming Mode |
| Pitfall 8: Non-Steam Game picker doesn't list Flatpaks | ⚠ Hardware-empirical only | Desktop → Add Non-Steam Game → find .desktop |
| Pitfall 8: Gaming Mode launch fails | ⚠ Hardware-empirical only | Steam shortcut must launch app in Gaming Mode |
| Pitfall 13: D-Bus rewrite breaks BLE in Flatpak | ✓ Mitigated (in_flatpak() gate, Phase 13) | BLE must connect inside Flatpak (the gate is a no-op) |

### Gamescope + WebKitGTK Interaction

Gamescope is a micro-compositor used by Steam Gaming Mode. It's known to interact poorly with WebKitGTK in certain configurations:

1. **GPU compositing:** WebKitGTK defaults to GPU-accelerated compositing. Gamescope's llvmpipe/software rendering path can cause a black or white screen.
2. **Mitigation (already in place):** `WEBKIT_DISABLE_COMPOSITING_MODE=1` forces CPU-based rendering. This is set in both the Flatpak manifest (`--env=`) and Rust code (`set_var`).
3. **Fallback if mitigation fails:** Try `--env=WEBKIT_DISABLE_DMABUF_RENDERER=1` (DMABUF renderer regression in newer WebKitGTK). Try `--socket=fallback-x11` only (drop Wayland). Document which combo works.

### Steam Input Controller Behavior

Steam Deck's built-in controller can operate in two modes relevant to this app:

1. **Steam Input enabled (default):** Steam remaps the gamepad to keyboard/mouse events. The app sees kbd/mouse events, not raw gamepad. gilrs may report zero gamepads.
2. **Gamepad pass-through:** Steam Input is configured to "Gamepad with Joystick Trackpad" or disabled. The app sees raw gamepad events through gilrs → `/dev/input/event*`.

The validation must document which template works and recommend one. D-13 from CONTEXT.md requires documenting a recommended template regardless.

### Flatpak Version on Steam Deck

The `--device=input` finish-arg requires Flatpak ≥ 1.15.6 (stable in 1.16). SteamOS Stable channel may ship an older version. The validation must:

1. Record `flatpak --version` on the test Deck
2. If `--device=input` is rejected, test `--device=all` fallback (per D-15)
3. Document which Flatpak/SteamOS version needs which flag

### Flatpak Sideload Behavior

Single-file `.flatpak` bundles have specific install semantics:

1. `flatpak install --user RobotController-x86_64.flatpak` installs to `~/.local/share/flatpak/`
2. Missing runtimes (org.freedesktop.Platform//24.08) are auto-fetched from Flathub
3. Install is per-user, not system-wide (survives SteamOS updates)
4. Desktop file exports to `~/.local/share/flatpak/exports/share/applications/`
5. Binary + data at `~/.var/app/com.ks0555.robotcontroller/`

### What NOT to Validate (Out of Scope)

These are deferred or covered by other phases:

- **Auto-update:** Sideload bundles don't auto-update (Pitfall 7). Manual upgrade workflow documented in Phase 16.
- **Flathub submission:** Not attempted. Sideload-only for v2.1.
- **ARM64 / macOS:** Steam Deck is x86_64 only.
- **New UI components:** Phase 14 validates existing UI, doesn't build new components.
- **ostree repo / self-hosted updates:** Deferred to v2.2+.
- **Production signing:** Self-signed bundle is acceptable for sideload.

---

## Research Findings

### Finding 1: Validation is Hardware-Empirical, Not Automatable

The five success criteria (DECK-01 through DECK-04, VAL-09) ALL require a physical Steam Deck with a BT24 robot powered on nearby. No CI or VM can substitute. The most valuable deliverable is a thorough, reusable checklist so future releases can be validated by anyone with a Deck.

### Finding 2: The `--device=input` vs `--device=all` Question Is Empirical

SteamOS ships different Flatpak versions on different channels. The manifest has `--device=input` as the primary choice with `--device=all` commented as a fallback. The validation MUST test which one works on the actual Deck and document the result. This is D-15 from CONTEXT.md.

### Finding 3: Gaming Mode Is the Real Risk Surface

Desktop Mode validation is straightforward (it's just KDE/X11 or KDE/Wayland). Gaming Mode adds Gamescope, which has historically had WebKitGTK rendering bugs. The PITFALLS.md (#5, #8) and CONTEXT.md (D-11 through D-14) both emphasize Gaming Mode as the primary risk. The validation must include the full Desktop → Gaming → Desktop round-trip.

### Finding 4: Log Capture Must Be Done Correctly

CONTEXT.md D-08 specifies `flatpak run --env=RUST_LOG=debug com.ks0555.robotcontroller 2> validation-logs/YYYY-MM-DD-app.log`. This captures stderr from the Flatpak container. Note: stdout from `flatpak run` itself is NOT the app's output — redirecting stderr inside the `flatpak run` command captures the app's logs. The `--env=` flag passes env vars into the sandbox.

Additionally, D-10 requires capturing `flatpak run --command=env` to verify `WEBKIT_DISABLE_COMPOSITING_MODE=1` is present in the sandbox environment.

### Finding 5: Steam Input Has Two Paths

Steam Input can either pass through raw gamepad events (what we want) or remap them to keyboard/mouse (which would break the robot controller). The validation must test both:

1. Steam Input **enabled** (default) — does the app still receive gamepad events?
2. Steam Input **disabled** / set to "Gamepad" template — gamepad events should definitely work.

D-12 and D-13 require testing both paths and documenting a recommended template.

### Finding 6: Preconditions Matter

The BT24 robot must be powered on and in Bluetooth advertising mode for BLE validation. The Steam Deck must have Bluetooth enabled. These are simple but must be in the checklist's precondition section (D-02).

### Finding 7: No application code changes permitted

The CONTEXT.md `## Code That Must Not Change` section and the requirement traceability are clear: this phase produces documentation artifacts only (`flatpak/VALIDATION-CHECKLIST.md`, `flatpak/validation-reports/`, `flatpak/validation-logs/`). No Rust, TypeScript, manifest, or build script modifications.

---

## Deliverables Map

Based on CONTEXT.md decisions:

| Decision | Deliverable | What It Is |
|----------|------------|------------|
| D-01 | `flatpak/VALIDATION-CHECKLIST.md` | Reusable pass/fail checklist, req-ID annotations |
| D-02, D-03 | Preconditions section in checklist | SteamOS version, Flatpak version, BT24 powered, BT enabled |
| D-04 | Report template | Structure for dated reports in `flatpak/validation-reports/` |
| D-05 | Checklist items | Install, Desktop BLE+gp, reconnect, rapid dir, S cmd, Non-Steam, Gaming Mode, round-trip, offline, full UI |
| D-06 | Latency annotation | Qualitative per-step (immediate/slight lag/noticeable) |
| D-08, D-09, D-10 | Log capture commands | `flatpak run --env=RUST_LOG=debug ... 2> log`, `env` dump |
| D-11, D-14 | Gaming Mode protocol | Escalation steps for black screen, round-trip test |
| D-12, D-13 | Steam Input doc | Test both enabled/pass-through, document template |
| D-15, D-16, D-17, D-18 | Failure handling | Fallback paths for device=input, BLE, install, black screen |

---

## Validation Architecture Diagram

```
flatpak/VALIDATION-CHECKLIST.md  ← Reusable template (this phase creates)
         │
         ▼
flatpak/validation-reports/YYYY-MM-DD-REPORT.md  ← Dated fill (this phase creates example)
         │
         ├── Preconditions (SteamOS ver, Flatpak ver, BT24 powered)
         ├── Desktop Mode tests (install, launch, BLE, gamepad, reconnect, rapid, S, UI)
         ├── Non-Steam Game test (picker, shortcut, launch)
         ├── Gaming Mode tests (launch, BLE, gamepad, render quality)
         ├── Round-trip test (Desktop → Gaming → Desktop)
         ├── Offline test (no BT24 nearby — graceful degradation)
         ├── Steam Input tests (enabled + pass-through)
         └── Log snippets (RUST_LOG=debug excerpt, env dump)
```

---

## Sources

**Internal:**
- `.planning/phases/14-steam-deck-on-device-validation/14-CONTEXT.md` — 18 locked decisions
- `.planning/REQUIREMENTS.md` — DECK-01 through DECK-04, VAL-09
- `.planning/research/PITFALLS.md` — Pitfalls 2, 4, 5, 7, 8, 13
- `flatpak/com.ks0555.robotcontroller.yaml` — Manifest with all finish-args
- `apps/frontend/src-tauri/src/lib.rs` — in_flatpak() gate, WEBKIT set_var
- `.planning/phases/13-sandbox-permissions-ble-gamepad/13-01-SUMMARY.md` — Phase 13 completion status
- `.planning/phases/12-manifest-appstream-local-build/12-02-SUMMARY.md` — Phase 12 build artifacts

**External (PITFALLS.md references):**
- Flatpak Sandbox Permissions: https://docs.flatpak.org/en/latest/sandbox-permissions-reference.html
- Flatpak Command Reference: https://docs.flatpak.org/en/latest/flatpak-command-reference.html
- Heroic Games Launcher Issue #4708 (Steam Input + Flatpak runtime 24.08): https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/4708
- BoilR Discussion #425 (Add Flatpak as Non-Steam Game): https://github.com/PhilipK/BoilR/discussions/425
