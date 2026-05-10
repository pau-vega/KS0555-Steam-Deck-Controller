# Steam Deck On-Device Validation Checklist

> Reusable across releases. Copy this checklist, fill it out during a validation session on a real Steam Deck, and save the result as `flatpak/validation-reports/YYYY-MM-DD-REPORT.md`.

## Preconditions

- [ ] Steam Deck is running SteamOS (record version: **\_**)
- [ ] Flatpak version is **\_** (`flatpak --version`)
- [ ] Bluetooth is enabled on the Steam Deck
- [ ] BT24 robot is powered on, in range, and advertising (blue LED blinking)
- [ ] RobotController-x86_64.flatpak bundle built from commit **\_** (`git rev-parse HEAD`)

## 1. Installation (DECK-01)

- [ ] PASS / [ ] FAIL — 1.1. `flatpak install --user RobotController-x86_64.flatpak` completes without error
- [ ] PASS / [ ] FAIL — 1.2. Flathub remote auto-fetches missing runtime `org.freedesktop.Platform//24.08` (if not already cached)
- [ ] PASS / [ ] FAIL — 1.3. `flatpak list | grep com.ks0555.robotcontroller` shows the app installed
- [ ] PASS / [ ] FAIL — 1.4. `flatpak run --command=ls com.ks0555.robotcontroller /app/bin/robot-controller` returns the binary path

## 2. Desktop Mode — BLE + Gamepad (DECK-02)

- [ ] PASS / [ ] FAIL — 2.1. `flatpak run com.ks0555.robotcontroller` opens the app window in Desktop Mode
- [ ] PASS / [ ] FAIL — 2.2. StatusBar shows "Scanning..." or "Disconnected" (not blank or error)
- [ ] PASS / [ ] FAIL — 2.3. App scans and discovers the BT24 robot (StatusBar shows device found)
- [ ] PASS / [ ] FAIL — 2.4. Clicking Connect establishes BLE connection; StatusBar shows "Connected"
- [ ] PASS / [ ] FAIL — 2.5. Steam Deck built-in gamepad registers — ControlPad buttons highlight on press
- [ ] PASS / [ ] FAIL — 2.6. Forward (F) command drives the robot forward (verify robot moves)
- [ ] PASS / [ ] FAIL — 2.7. Back (B) command drives the robot backward (verify robot moves)
- [ ] PASS / [ ] FAIL — 2.8. Left (L) command turns the robot left (verify robot turns)
- [ ] PASS / [ ] FAIL — 2.9. Right (R) command turns the robot right (verify robot turns)
- [ ] PASS / [ ] FAIL — 2.10. Stop (S) command stops the robot (center stick / no input -> robot stops)
- [ ] PASS / [ ] FAIL — 2.11. Rapid direction changes (F->B->L->R sequence) — robot responds to each change
  - Latency: **\_** (immediate / slight lag / noticeable delay)
- [ ] PASS / [ ] FAIL — 2.12. BLE reconnect: disconnect robot (power off BT24), wait 5s, power on — app reconnects or StatusBar updates correctly
  - Latency: **\_** (immediate / slight lag / noticeable delay)

## 3. Non-Steam Game (DECK-03)

- [ ] PASS / [ ] FAIL — 3.1. In Steam Desktop Mode, "Add a Non-Steam Game" picker finds `com.ks0555.robotcontroller.desktop`
- [ ] PASS / [ ] FAIL — 3.2. The `.desktop` file is located at `~/.local/share/flatpak/exports/share/applications/com.ks0555.robotcontroller.desktop`
- [ ] PASS / [ ] FAIL — 3.3. The resulting Steam shortcut uses launch command: `flatpak run com.ks0555.robotcontroller`
- [ ] PASS / [ ] FAIL — 3.4. Launching the shortcut from Steam Desktop Mode opens the app

## 4. Gaming Mode (DECK-04)

- [ ] PASS / [ ] FAIL — 4.1. Switch to Gaming Mode. Launch the Non-Steam Game shortcut.
- [ ] PASS / [ ] FAIL — 4.2. App window renders — NO black screen, NO white screen
  - If black/white screen: try known workarounds (see escalation protocol below)
- [ ] PASS / [ ] FAIL — 4.3. Steam Deck built-in gamepad registers in Gaming Mode — ControlPad buttons respond
- [ ] PASS / [ ] FAIL — 4.4. F/B/L/R/S commands reach the BT24 robot (verify robot moves for each direction)
- [ ] PASS / [ ] FAIL — 4.5. Latency in Gaming Mode: **\_** (immediate / slight lag / noticeable delay) — compared to Desktop Mode: **\_** (same / worse / better)

### Gaming Mode Escalation Protocol (if black/white screen occurs)

If step 4.2 fails, try these in order. Document which (if any) resolves the issue:

1. [ ] Tried: `flatpak run --env=WEBKIT_DISABLE_DMABUF_RENDERER=1 com.ks0555.robotcontroller` — Result: **\_**
2. [ ] Tried: X11-only (`flatpak run --nosocket=wayland --socket=fallback-x11 com.ks0555.robotcontroller`) — Result: **\_**
3. [ ] Tried: Double env vars (both `WEBKIT_DISABLE_COMPOSITING_MODE=1` and `WEBKIT_DISABLE_DMABUF_RENDERER=1`) — Result: **\_**
4. [ ] Captured: `flatpak run --command=env com.ks0555.robotcontroller` output — file: `validation-logs/YYYY-MM-DD-env.log`
5. [ ] Captured: `flatpak run --command=glxinfo com.ks0555.robotcontroller 2>&1` GPU info — file: **\_** (if glxinfo available)

Working combo (if found): **\_**

## 5. Steam Input Configuration (D-12, D-13)

- [ ] PASS / [ ] FAIL — 5.1. Steam Input ENABLED (default): gamepad events reach the app? (Yes / No)
- [ ] PASS / [ ] FAIL — 5.2. Steam Input set to "Gamepad with Joystick Trackpad" template: gamepad events reach the app? (Yes / No)
- [ ] PASS / [ ] FAIL — 5.3. Steam Input set to "Gamepad" (pass-through): gamepad events reach the app? (Yes / No)

**Recommended Steam Input template:** **\_** (document which template from 5.1-5.3 works best)

## 6. Round-Trip (D-14)

- [ ] PASS / [ ] FAIL — 6.1. Desktop Mode -> launch app -> works ✓
- [ ] PASS / [ ] FAIL — 6.2. Switch to Gaming Mode -> launch app -> works ✓
- [ ] PASS / [ ] FAIL — 6.3. Switch back to Desktop Mode -> launch app -> works ✓

## 7. Offline Mode (D-05)

- [ ] PASS / [ ] FAIL — 7.1. Launch app with BT24 powered OFF — StatusBar shows "Disconnected" or "Scanning..." (graceful, no crash)
- [ ] PASS / [ ] FAIL — 7.2. Scan times out gracefully (no infinite spinner, no frozen UI)
- [ ] PASS / [ ] FAIL — 7.3. ControlPad buttons are visible but non-functional (expected when no robot connected)

## 8. UI Validation (D-05)

- [ ] PASS / [ ] FAIL — 8.1. StatusBar shows correct states: Disconnected -> Scanning -> Connecting -> Connected
- [ ] PASS / [ ] FAIL — 8.2. StatusBar re-shows "Disconnected" after robot powers off (BLE auto-disconnect)
- [ ] PASS / [ ] FAIL — 8.3. ControlPad shows all 5 directional buttons (F, B, L, R, S) and they highlight on press
- [ ] PASS / [ ] FAIL — 8.4. App window has correct title "Robot Controller" (not "Tauri App" or blank)
- [ ] PASS / [ ] FAIL — 8.5. Window decorations and sizing work correctly in both Desktop and Gaming Mode

## 9. Edge Cases (D-15, D-16, D-17, D-18)

- [ ] PASS / [ ] FAIL — 9.1. `--device=input` finish-arg is honored (gamepad works) — if not, test `--device=all` fallback
  - Fallback needed? (Yes / No) — If yes, document Flatpak/SteamOS version: **\_**
- [ ] PASS / [ ] FAIL — 9.2. BLE works in Gaming Mode (if BLE works in Desktop but not Gaming, document as known limitation per D-16)
  - Known limitation triggered? (Yes / No)
- [ ] PASS / [ ] FAIL — 9.3. Flatpak install failure — if `flatpak install` fails, retry with `--verbose` and capture error: **\_**
  - Error resolved? (Yes / No) — Fix: **\_**
- [ ] PASS / [ ] FAIL — 9.4. `flatpak run --command=env com.ks0555.robotcontroller` output includes `WEBKIT_DISABLE_COMPOSITING_MODE=1` (belt-and-suspenders env var is active in sandbox — D-10)
- [ ] PASS / [ ] FAIL — 9.5. `flatpak run --env=RUST_LOG=debug com.ks0555.robotcontroller 2> validation-logs/YYYY-MM-DD-app.log` produces a log file with BLE connect, gamepad-direction events, and ble_send entries (embed key snippets in report per D-08/D-09)

## 10. Summary

- [ ] All DECK-01 criteria pass (installation)
- [ ] All DECK-02 criteria pass (Desktop BLE + gamepad)
- [ ] All DECK-03 criteria pass (Non-Steam Game)
- [ ] All DECK-04 criteria pass (Gaming Mode)
- [ ] VAL-09 satisfied (end-to-end, log artifacts captured)

**Overall:** PASS / FAIL

**Tester:** **\_**
**Date:** YYYY-MM-DD
**Flatpak build version:** **\_** (from `flatpak run --command=sh -c 'echo $FLATPAK_VERSION' com.ks0555.robotcontroller` or build commit hash)
**SteamOS version:** **\_** (`cat /etc/os-release | grep VERSION`)
**Steam Deck model:** **\_** (LCD / OLED)

## Log Artifacts

- [ ] App log captured: `validation-logs/YYYY-MM-DD-app.log`
- [ ] Env dump captured: `validation-logs/YYYY-MM-DD-env.log`
- [ ] Key log snippets embedded in report (see REPORT-TEMPLATE.md for format)
