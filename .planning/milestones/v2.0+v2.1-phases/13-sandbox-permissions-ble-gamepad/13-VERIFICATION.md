# Phase 13: Sandbox Permissions for BLE + Gamepad — Verification

**Created:** 2026-05-10
**Phase status:** Complete
**Phase goal:** Flatpak sandbox finish-args for BLE (`--system-talk-name=org.bluez`), gamepad (`--device=input`), D-Bus gate in lib.rs, anti-feature checklist

## Success Criteria Verification

### SC-1: Flatpak BLE connectivity through sandbox

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 13 Success Criterion 1 |
| **What to verify** | `flatpak run com.ks0555.robotcontroller` connects to a real BT24 robot via BLE through the Flatpak D-Bus proxy |
| **Verification method** | Two-command sequence: (1) Host shell `dbus-monitor --system 'type=signal,interface=org.freedesktop.DBus' timeout 10` while connecting. (2) Inside sandbox: `flatpak run --command=sh com.ks0555.robotcontroller -c 'busctl --system list \| grep bluez'` |
| **Expected result** | dbus-monitor shows Flatpak D-Bus proxy activity. busctl lists `org.bluez` inside the sandbox |
| **Evidence** | Terminal output capture of both commands |
| **Automated** | No — requires real BT24 robot hardware |

#### D-01: Flatpak detection (belt-and-suspenders)

| Aspect | Detail |
|--------|--------|
| **Source** | 13-CONTEXT.md |
| **What to verify** | `in_flatpak()` checks both `FLATPAK_ID` env var and `/.flatpak-info` file |
| **Verification method** | `grep -n 'FLATPAK_ID\|/.flatpak-info' apps/frontend/src-tauri/src/lib.rs` |
| **Expected result** | Two matches: `std::env::var("FLATPAK_ID").is_ok()` and `Path::new("/.flatpak-info").exists()` |
| **Evidence** | File path and line numbers from grep output |

#### D-02: D-Bus gate scope

| Aspect | Detail |
|--------|--------|
| **Source** | 13-CONTEXT.md |
| **What to verify** | Entire D-Bus rewrite block (DBUS_SYSTEM_BUS_ADDRESS check + socket probe + set_var) gated behind `!in_flatpak()` |
| **Verification method** | `grep -n 'if !in_flatpak\|if ! in_flatpak' apps/frontend/src-tauri/src/lib.rs` |
| **Expected result** | At least one match showing the gate wrapping the D-Bus block |
| **Evidence** | File + line number from grep |

### SC-2: Gamepad input through Flatpak sandbox

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 13 Success Criterion 2 |
| **What to verify** | `flatpak run` reads gamepad input via gilrs inside the sandbox |
| **Verification method** | (1) `flatpak run --command=ls com.ks0555.robotcontroller /dev/input 2>&1 \| grep -c event` must return >= 1. (2) Launch `flatpak run com.ks0555.robotcontroller` with `RUST_LOG=debug` and check for "gamepad-direction" in stderr |
| **Expected result** | /dev/input lists event* nodes. Gamepad direction events emitted when joystick moved |
| **Evidence** | Terminal output of ls /dev/input. RUST_LOG stderr capture |
| **Automated** | No — requires real gamepad hardware |

### SC-3: Manifest finish-args contain all required flags

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 13 Success Criterion 3 |
| **What to verify** | Manifest finish-args include BLE, gamepad, display flags, and WEBKIT env var |
| **Verification method** | Run for each flag: `grep -c '<flag>' flatpak/com.ks0555.robotcontroller.yaml`. Must find each at least once |
| **Expected result** | All flags present. `--device=all` appears only in a comment (prefixed by `#`) |
| **Evidence** | grep output for each flag |

**BLE flags:**
| Flag | Command | Expected |
|------|---------|----------|
| `--system-talk-name=org.bluez` | `grep -c '--system-talk-name=org.bluez' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--system-talk-name=org.bluez.*` | `grep -c '--system-talk-name=org.bluez.\*' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--allow=bluetooth` | `grep -c '--allow=bluetooth' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--share=network` | `grep -c '--share=network' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |

**Gamepad flags:**
| Flag | Command | Expected |
|------|---------|----------|
| `--device=input` | `grep -c '--device=input' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `# --device=all` (comment only) | `grep -c '#.*--device=all' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |

**Display flags:**
| Flag | Command | Expected |
|------|---------|----------|
| `--socket=wayland` | `grep -c '--socket=wayland' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--socket=fallback-x11` | `grep -c '--socket=fallback-x11' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--share=ipc` | `grep -c '--share=ipc' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| `--device=dri` | `grep -c '--device=dri' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |

**Env flags:**
| Flag | Command | Expected |
|------|---------|----------|
| `WEBKIT_DISABLE_COMPOSITING_MODE=1` | `grep -c 'WEBKIT_DISABLE_COMPOSITING_MODE' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |

### SC-4: lib.rs in_flatpak() gate on D-Bus rewrite

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 13 Success Criterion 4 |
| **What to verify** | D-Bus address rewrite gated behind Flatpak detection check. Inside Flatpak the rewrite is a no-op with explanatory comment |
| **Verification method** | Three grep commands |
| **Expected result** | `in_flatpak` function defined. D-Bus block gated behind `!in_flatpak()`. Both detection methods present |
| **Evidence** | grep output lines from lib.rs |

| Check | Command | Expected |
|-------|---------|----------|
| Function definition | `grep -n 'fn in_flatpak' apps/frontend/src-tauri/src/lib.rs` | Shows function definition |
| Gate wrapping D-Bus block | `grep -n 'if !in_flatpak\|if ! in_flatpak' apps/frontend/src-tauri/src/lib.rs` | Shows the gate |
| Both detection methods | `grep -n 'FLATPAK_ID\|/.flatpak-info' apps/frontend/src-tauri/src/lib.rs` | Shows both checks |

#### D-03: WEBKIT set_var unconditional

| Aspect | Detail |
|--------|--------|
| **Source** | 13-CONTEXT.md |
| **What to verify** | WEBKIT_DISABLE_COMPOSITING_MODE set_var is OUTSIDE the `!in_flatpak()` gate |
| **Verification method** | `grep -n 'set_var.*WEBKIT_DISABLE_COMPOSITING_MODE' apps/frontend/src-tauri/src/lib.rs` |
| **Expected result** | Match exists. Confirm via surrounding context that it is not inside the `if !in_flatpak()` block |
| **Evidence** | grep match + 5 lines of surrounding context |

### SC-5: Manifest contains NO anti-features

| Aspect | Detail |
|--------|--------|
| **Source** | ROADMAP.md Phase 13 Success Criterion 5 |
| **What to verify** | Manifest contains no forbidden finish-args. Anti-feature checklist comment block exists |
| **Verification method** | grep for each forbidden arg — must return 0 outside comments. grep for checklist comment presence |
| **Expected result** | Each forbidden arg appears only in the checklist comment. Checklist comment is present |
| **Evidence** | grep output for each check |

| Check | Command | Expected |
|-------|---------|----------|
| Anti-feature checklist present | `grep -c 'Anti-feature checklist\|SBX-06' flatpak/com.ks0555.robotcontroller.yaml` | >= 1 |
| No `--filesystem=home` | `grep -c '--filesystem=home' flatpak/com.ks0555.robotcontroller.yaml` | 0 or comment-only |
| No `--device=bluetooth` | `grep -c '--device=bluetooth' flatpak/com.ks0555.robotcontroller.yaml` | 0 or comment-only |
| No `--talk-name=org.bluez` | `grep -c '--talk-name=org.bluez' flatpak/com.ks0555.robotcontroller.yaml` | 0 or comment-only |
| No tray-icon args | `grep -cE '--socket=session-bus\|--socket=system-bus' flatpak/com.ks0555.robotcontroller.yaml` | 0 or comment-only |
| No portal grant | `grep -c 'org.freedesktop.Flatpak' flatpak/com.ks0555.robotcontroller.yaml` | 0 or comment-only |

#### D-05: Anti-feature checklist implementation

| Aspect | Detail |
|--------|--------|
| **Source** | 13-CONTEXT.md |
| **What to verify** | Anti-feature checklist placed as comment block at top of manifest listing 6 forbidden finish-args with explanations |
| **Verification method** | `head -30 flatpak/com.ks0555.robotcontroller.yaml` |
| **Expected result** | Comment block at top lists each forbidden arg + reason |
| **Evidence** | First 30 lines of manifest file |

#### D-04: Manual hardware verification (VAL-06, VAL-07)

| Aspect | Detail |
|--------|--------|
| **Source** | 13-CONTEXT.md |
| **What to verify** | Phase 13 SUMMARY.md references manual validation for VAL-06 (BLE through sandbox) and VAL-07 (gamepad through sandbox) |
| **Verification method** | `grep -c 'VAL-06\|VAL-07' .planning/phases/13-sandbox-permissions-ble-gamepad/13-01-SUMMARY.md` |
| **Expected result** | >= 1 — summary documents manual hardware validation required |
| **Evidence** | SUMMARY.md grep output |

## Overall Verification Summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC-1: BLE connectivity through sandbox | | Verify via dbus-monitor + busctl on Steam Deck with real BT24 robot |
| SC-2: Gamepad input through sandbox | | Verify via /dev/input listing + RUST_LOG=debug event emission |
| SC-3: Finish-args completeness | | Verify via grep commands above |
| SC-4: lib.rs in_flatpak() gate | | Verify via grep commands above |
| SC-5: Anti-features | | Verify via grep commands above |
