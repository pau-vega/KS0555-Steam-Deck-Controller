# Codebase Concerns

**Analysis Date:** 2026-05-14

This audit captures technical debt, known issues, security/perf hotspots, and fragile areas surfaced by a full-repo scan after the v2.0 + v2.1 milestone shipped. Items previously acknowledged in `.planning/STATE.md` "Deferred Items" are surfaced here with current status. Most concerns cluster in three areas: **stale tests that no longer match the source they assert on**, **doc/code runtime drift (`org.gnome.Platform//48` vs `org.freedesktop.Platform//24.08`)**, and **dead Web Bluetooth / Web Gamepad branches** left behind by the Tauri migration.

## Deferred Items (carried from STATE.md)

These were explicitly deferred at milestone close on 2026-05-12. They remain open and are restated here so they don't get lost in the next milestone planning cycle.

**VAL-06 — Local flatpak run, BLE on BT24:**
- Source: `.planning/STATE.md:78`
- Status: deferred — requires real BT24 hardware
- Risk: BLE pairing/scan code path has never been exercised against a real BT24 inside a Flatpak sandbox. The D-Bus gate (`apps/frontend/src-tauri/src/lib.rs:8-13`) is unit-asserted by string match (`flatpak_sandbox_test.rs:15-29`), never by behaviour.
- Fix approach: schedule a manual test session with BT24 + Steam Deck, capture logs to `flatpak/validation-logs/`, fill `flatpak/VALIDATION-CHECKLIST.md`.

**VAL-07 — Local flatpak run, gamepad input:**
- Source: `.planning/STATE.md:79`
- Status: deferred — requires real hardware
- Risk: `gilrs` evdev path inside the Flatpak sandbox is unverified end-to-end. `--device=all` is currently granted (manifest line 30) rather than the narrower `--device=input` the docs claim — so the sandbox is broader than the architecture promises.
- Fix approach: validate against a Steam Deck running the produced `.flatpak`, then narrow `--device=all → --device=input` once verified.

**VAL-09 — Real-Deck end-to-end test:**
- Source: `.planning/STATE.md:80`
- Status: deferred — Steam Deck + robot required
- Risk: There has never been a confirmed full F/B/L/R/S round-trip from gamepad → Rust → BLE → BT24 → motors on the shipped Flatpak. The CI build is a smoke test only.
- Fix approach: physical session with checklist + screenshot/video capture; promote to a versioned validation report under `flatpak/validation-reports/`.

**VAL-08 tag-push bypass (lefthook missing lock):**
- Source: `.planning/STATE.md:81`
- Files: `lefthook.yml` (4 commands: format, lint, typecheck, commitlint — none gate `apps/frontend/src/app.tsx`)
- Status: deferred — "pre-commit hooks cover PRs"
- Reality check: `.github/workflows/ci.yml:34-35` runs `git diff --exit-code -- apps/frontend/src/app.tsx` on PR, which IS a working lock at the PR boundary. But the deferral comment ("pre-commit hooks cover PRs") is misleading: lefthook doesn't enforce the lock — only CI does. A direct push to `main` (tag or merge that bypasses PR) skips the check entirely.
- Fix approach: add a `pre-commit` hook in `lefthook.yml` that runs `git diff --cached --name-only | grep -q '^apps/frontend/src/app.tsx$' && echo "app.tsx is locked" && exit 1`. ~5 lines.

**appstream-util validate not in CI:**
- Source: `.planning/STATE.md:82`
- Status: deferred — non-blocking
- Risk: `flatpak/com.ks0555.robotcontroller.metainfo.xml:34-38` declares a `<screenshot>` with `<caption>` but **no `<image>` element** — that's an AppStream spec violation. A real `appstream-util validate-relax` run would flag it. Currently it ships uncaught.
- Fix approach: add `appstream-util validate-relax flatpak/com.ks0555.robotcontroller.metainfo.xml` to `build.yml` (or a separate `verify` job) and fix the screenshot block.

**upgrade-robot-controller.sh integration test missing:**
- Source: `.planning/STATE.md:83`
- Files: `upgrade-robot-controller.sh:1-397`
- Status: deferred — not tested against a real release
- Bugs already in the script (see "Known Bugs" below).
- Fix approach: add a CI job (or `flatpak/tests/verify-upgrade.sh`) that runs `--check` against the latest release; harder to test the install path without privileged Flatpak runtime.

## Tech Debt

**Stale "tests" that file-grep source instead of asserting behaviour:**
- Issue: Almost every Rust integration test in `apps/frontend/src-tauri/tests/` opens a `.rs` file with `fs::read_to_string` and runs `content.contains("…")`. They are documentation guards, not behaviour tests, and they silently rot as soon as the source they string-match against changes.
- Files: `apps/frontend/src-tauri/tests/ble_connect_test.rs` (109 lines), `ble_disconnect_test.rs` (88), `ble_send_test.rs` (129), `ble_event_test.rs` (78), `ble_state_test.rs` (89), `ble_linux_filter_test.rs` (128), `flatpak_sandbox_test.rs` (278), `validation_test.rs` (270), `tauri_shell_test.rs` (182)
- Impact: green CI runs do not mean the BLE/gamepad code works — only that the strings the tests look for still appear somewhere in the file. See "Known Bugs" below for examples where they already lie.
- Fix approach: replace with real Cargo unit tests on pure functions (`get_direction_from_axes` is already a model) and minimal integration smoke tests behind `#[ignore]` requiring hardware. Delete ~80% of the existing tests, keep the ones that target real logic.

**Dead Web Bluetooth branch in `useBluetooth`:**
- Issue: `apps/frontend/src/hooks/use-bluetooth.ts:30-122` keeps a full Web Bluetooth code path (`navigator.bluetooth.requestDevice`, `gattserverdisconnected`, `getPrimaryService`, `characteristicRef`). WebKitGTK (Tauri's webview on Linux) has no `navigator.bluetooth`, so on the only target platform this branch never runs. On macOS dev WebKit also lacks it. The only place this code executes is the Vitest test file (`use-bluetooth.test.ts:49-148`).
- Files: `apps/frontend/src/hooks/use-bluetooth.ts:1-122`, `apps/frontend/src/hooks/use-bluetooth.test.ts:49-148`
- Impact: 80+ lines of dead code + 100 lines of tests that exercise a path users will never hit. Also drags `@types/web-bluetooth` (`apps/frontend/package.json:29`) as a dependency. Confuses readers and gives a misleading sense of test coverage.
- Fix approach: delete the Web Bluetooth branch entirely, narrow `state` to `"disconnected" | "connecting" | "connected"`, remove `characteristicRef`, drop the Web Bluetooth describe block in tests, and remove `@types/web-bluetooth`.

**Dead Steam Deck detection in `useGamepad`:**
- Issue: `apps/frontend/src/hooks/use-gamepad.ts:6-72` defines `STEAM_DECK_VENDOR_ID`, `isSteamDeck`, `detectSteamDeck`, and returns `isDeck`. It uses `navigator.getGamepads()` — which Steam Input intercepts before the WebView sees it (the whole reason the project migrated to `gilrs`). The returned `isDeck` flag is never consumed (`app.tsx:13` destructures only `direction, gamepadConnected`).
- Files: `apps/frontend/src/hooks/use-gamepad.ts:6-72`, `apps/frontend/src/app.tsx:13`
- Impact: misleading dead path; in production `isDeck` is always false. Confuses readers and gives the impression we detect the Deck controller specifically.
- Fix approach: delete `STEAM_DECK_VENDOR_ID`, `STEAM_DECK_PRODUCT_ID`, `isSteamDeck`, `detectSteamDeck`, `isDeck` state and the `navigator.getGamepads` call. Hook reduces to ~30 lines.

**Stale runtime references — `org.gnome.Platform//48` vs `org.freedesktop.Platform//24.08`:**
- Issue: The manifest (`flatpak/com.ks0555.robotcontroller.yaml:11-12`) and CI (`.github/workflows/build.yml:165`) install and target `org.freedesktop.Platform//24.08`. Multiple docs and scripts still reference the older `org.gnome.Platform//48`.
- Files with stale GNOME 48 references:
  - `docs/ARCHITECTURE.md:69, 70, 501, 514`
  - `flatpak/README.md:13, 82, 83`
  - `flatpak/VALIDATION-CHECKLIST.md:16`
  - `flatpak/docker-build.sh:6, 69, 70, 79, 87` (Docker local build pulls `gnome-48` image, then installs `org.gnome.Platform//48` runtime — incompatible with manifest)
  - `flatpak/tests/verify-flatpak.sh:92` (asserts README references gnome 48)
  - `flatpak/com.ks0555.robotcontroller.metainfo.xml:61` (0.1.19 release note still says "Switch Flatpak runtime back to org.gnome.Platform//48")
- Impact: docs lie about what we ship; the Docker-based local build script will pull the wrong runtime and produce a Flatpak bundle that doesn't match CI; the verify-flatpak smoke test will fail on a fresh build. The `docs.test.ts:245-251` Vitest case (`R10: contains key keywords: ..., org.gnome.Platform`) requires `docs/ARCHITECTURE.md` to keep `org.gnome.Platform` — locking in the wrong runtime in docs.
- Fix approach: sweep replace `org.gnome.Platform//48` → `org.freedesktop.Platform//24.08`, `org.gnome.Sdk//48` → `org.freedesktop.Sdk//24.08`, update `flatpak/docker-build.sh` to use a freedesktop builder image (or `ghcr.io/flathub-infra/flatpak-github-actions:freedesktop-24.08` if available), update `docs.test.ts` assertion, and update `flatpak/tests/verify-flatpak.sh:92`.

**Stale finish-args references — `--allow=bluetooth` and `--device=input`:**
- Issue: Multiple docs and tests assert finish-args that are NOT in the actual manifest. The current manifest grants `--device=all` (line 30) and does NOT grant `--allow=bluetooth`. The flatpak/README.md `:106` even explicitly notes "(removed — `--allow=bluetooth` not needed; btleplug uses D-Bus only)" — which contradicts other parts of the same repo:
  - `apps/frontend/src-tauri/tests/flatpak_sandbox_test.rs:107-126` asserts `--allow=bluetooth` IS in the manifest → would FAIL
  - `apps/frontend/src-tauri/tests/flatpak_sandbox_test.rs:135-141` asserts `--device=input` IS in the manifest → would FAIL
  - `apps/frontend/src-tauri/ARCHITECTURE.md:60, 67-69` documents both as required
  - `docs/ARCHITECTURE.md:108, 115-117, 360, 507` documents both as required
  - `apps/frontend/src/docs.test.ts:103, 133` asserts the docs contain `device=input` → would PASS only because the docs are stale
- Impact: at least 2 Rust integration tests will fail on a fresh `cargo test`. Docs say the sandbox is tight (`--device=input`) but reality is loose (`--device=all`).
- Fix approach: pick a direction:
  1. Tighten the manifest: change `--device=all` to `--device=input`, validate on Steam Deck that gamepad still works. Add `--allow=bluetooth` only if a btleplug AF_BLUETOOTH fallback ever actually triggers (currently not used).
  2. OR loosen the docs to match `--device=all`, delete the `--allow=bluetooth` assertions, and fix the Rust tests.
  Recommended: option (1), with VAL-07 as the gating manual test.

**`SCAN_TIMEOUT` test expects 5s but source says 10s:**
- Issue: `apps/frontend/src-tauri/src/ble/mod.rs:14` is `Duration::from_secs(10)`. `apps/frontend/src-tauri/tests/ble_connect_test.rs:82-84` asserts `content.contains("Duration::from_secs(5)")`.
- Impact: this Rust integration test would fail. The grep-based test framework hides which one is "right" — but the user-facing error message at `ble/mod.rs:117-121` correctly says "Scan timed out after {SCAN_TIMEOUT.as_secs()} seconds" so the source is consistent with itself, the test is just stale.
- Fix approach: update test or convert to a real assertion on the constant.

**Stale "Linux/BlueZ Pitfall 2" comments removed from source but still required by tests:**
- Issue: `apps/frontend/src-tauri/tests/ble_linux_filter_test.rs:46-58` asserts `mod.rs` contains the strings `"Linux/BlueZ"`, `"Pitfall 2"`, `"merges discovery filters"`, `"BLE-06"`, `"name == BT24_NAME"`, `"service-UUID verification"`. Current `apps/frontend/src-tauri/src/ble/mod.rs` (218 lines) contains **none** of those — the comments were removed in a previous cleanup but the file-grep tests were not updated.
- Impact: 6+ assertions in `ble_linux_filter_test.rs` will fail. Plus the assertion at `:108-127` that `"name == BT24_NAME"` is in the source — the actual code uses `name.contains(BT24_NAME)`, never `==`.
- Fix approach: delete `ble_linux_filter_test.rs` entirely or rewrite to test the post-filter behaviour by mocking `Adapter::peripherals()`.

**`test_gamepad_steam_filter` is a false positive:**
- Issue: `apps/frontend/src-tauri/tests/validation_test.rs:152-161` asserts `gamepad/mod.rs` contains the string `"Steam"`. The only matches are two **comments** at `gamepad/mod.rs:123, 149` — there is no actual name filter ("D-09: Pick first gamepad — no name filter"). The test passes for the wrong reason.
- Impact: green test misrepresents what the code does. Anyone trying to understand "do we filter by Steam controller name?" will get the wrong answer.
- Fix approach: delete the test, or rewrite to assert the gamepad-picking strategy is first-wins (no name filter).

**`apps/backend/` directory still exists but is empty:**
- Issue: The Fastify backend was deprecated in Phase 6. The directory is empty (no files) but is still in `pnpm-workspace.yaml:2` (`"apps/*"`) and on disk at `apps/backend/`.
- Files: `apps/backend/` (empty dir), `pnpm-workspace.yaml:2`
- Impact: confusing layout; future agents may try to re-populate it. `turbo` will silently match `apps/*` and find nothing, which is harmless but noise.
- Fix approach: `rmdir apps/backend`; optionally tighten `pnpm-workspace.yaml` to `"apps/frontend"` explicitly.

**Version drift across manifests:**
- Issue: Five different version sources exist; not all are kept in sync.
  - Root `package.json:3` — `0.0.1`
  - `.github/.release-please-manifest.json:2` — `0.0.1`
  - `apps/frontend/package.json:3` — `0.1.3`
  - `apps/frontend/src-tauri/Cargo.toml:3` — `0.1.21`
  - `apps/frontend/src-tauri/tauri.conf.json:3` — `0.1.21`
  - `flatpak/com.ks0555.robotcontroller.metainfo.xml:49` — `0.1.21`
- Impact: release-please thinks we're at 0.0.1 and would propose 0.0.2 next; the Cargo/Tauri/metainfo bundle says 0.1.21. The CI extracts version from `Cargo.toml` (`build.yml:148`), so artifacts will be named `RobotController-0.1.21-x86_64.flatpak` while GitHub Releases (release-please) cuts a `v0.0.2` tag. Tags and assets will diverge.
- Fix approach: pick a single source of truth. Either (a) update release-please to track `Cargo.toml` as the primary versioned file (extra plugins) and bump root + frontend package.json to match, or (b) reset Cargo.toml to 0.0.1 and let release-please own all bumps going forward. The 2026-05-12 quick task `260512-002` ("Setup release-please and reset to 0.0.1") was started but never completed across all files.

**`build.sh` (local Flatpak build) is unused by the documented workflow:**
- Issue: `flatpak/build.sh` (129 lines) exists, but the README, justfile, and CI all bypass it. `justfile:128-143` invokes `flatpak-builder` directly; CI does the same (`build.yml:170`); `docker-build.sh` does the same. `flatpak/README.md:34-36` even explicitly notes "build.sh is the local build script. CI uses flatpak-builder directly".
- Files: `flatpak/build.sh:1-129`
- Impact: dead-ish code that diverges from the actual build path. On macOS it does only "structural validation" (YAML parse + xmllint), which `lefthook` already partly covers via formatting/lint.
- Fix approach: delete `flatpak/build.sh` and have macOS users run `just docker-flatpak-build` (Docker path) for actual builds. Move structural validation into a tiny `flatpak/validate.sh` if still wanted.

**`Cargo.toml` declares `gilrs` twice:**
- Issue: `apps/frontend/src-tauri/Cargo.toml:24` adds `gilrs` to top-level dependencies, and `:35-36` adds it again under `[target.'cfg(target_os = "linux")'.dependencies]` with the same version + features. The Linux-specific block is redundant.
- Files: `apps/frontend/src-tauri/Cargo.toml:23-36`
- Impact: cosmetic — Cargo merges them — but reads as if Linux needed a different config. Slight noise during dependency review.
- Fix approach: delete the `[target.'cfg(target_os = "linux")']` block.

**Tracked `.bak` icon file:**
- Issue: `apps/frontend/src-tauri/icons/icon.png.bak` is tracked in git and ships in source.
- Files: `apps/frontend/src-tauri/icons/icon.png.bak`
- Impact: 256×256 PNG (~12 KB), not referenced anywhere. Bloats source.
- Fix approach: `git rm apps/frontend/src-tauri/icons/icon.png.bak`.

**No Rust logging crate — `eprintln!` everywhere:**
- Issue: All Rust diagnostics are `eprintln!("[ble] ...")`-style print statements. `apps/frontend/src-tauri/Cargo.toml` has no `log`, `tracing`, `env_logger`, or `tracing-subscriber`. Yet `flatpak/README.md:185` and `13-VERIFICATION.md` instruct users to set `RUST_LOG=debug` — which does nothing.
- Files: `apps/frontend/src-tauri/src/lib.rs:24`, `apps/frontend/src-tauri/src/ble/mod.rs:113, 122`, `apps/frontend/src-tauri/src/gamepad/mod.rs:131, 138`
- Impact: no log level filtering, no structured logging, docs lie about `RUST_LOG`. Hard to diagnose field issues without rebuilding.
- Fix approach: add `tracing = "0.1"` + `tracing-subscriber = { version = "0.3", features = ["env-filter"] }`; replace `eprintln!` with `tracing::debug!/info!/error!`; init `EnvFilter::from_default_env()` in `lib.rs::run`.

## Known Bugs

**`upgrade-robot-controller.sh` "installed-commit" comparison is dead code:**
- Symptoms: when `flatpak info` doesn't expose a Version field, the script falls back to `echo "installed-${commit}"` (`upgrade-robot-controller.sh:136`). `compare_versions` then tries to handle that with `[ "${installed}" = "installed"* ]` (`:230`). Inside POSIX `[ ]`, the `*` is **literal**, not a glob. The branch never matches.
- Files: `upgrade-robot-controller.sh:230`
- Trigger: install a Flatpak via a path that doesn't include `Version:` in `flatpak info` output (rare but possible with locally-built bundles).
- Workaround: the script falls through to a numeric IFS-split comparison that will silently fail because `i_ver=(installed-${commit})` doesn't split into integers, so all `[ "${iv}" -lt "${lv}" ]` comparisons error out under `set -euo pipefail`.
- Fix: use `[[ "${installed}" == installed* ]]` (bash double-brackets) or `case "$installed" in installed*) ... esac`. ~1 line change.

**`RobotController-x86_64.flatpak` regex in `upgrade-robot-controller.sh` won't match versioned assets:**
- Symptoms: `upgrade-robot-controller.sh:189-192` selects release assets matching `RobotController-.*-x86_64\\.flatpak$`. CI uploads `RobotController-${VERSION}-x86_64.flatpak` (`build.yml:194`), so this matches. The `--default` Flatpak file at `flatpak-build` in `justfile:142` is `RobotController-x86_64.flatpak` (no version), which the script regex would NOT match.
- Files: `upgrade-robot-controller.sh:189-192`, `justfile:142`
- Trigger: hand-uploaded `RobotController-x86_64.flatpak` (no version) to a release — script won't see it.
- Impact: limited to manual / out-of-band releases; CI releases work.
- Fix: regex `RobotController(-[^/]+)?-x86_64\\.flatpak$` to handle both naming conventions.

**`build.yml` permissions race:** top-level `permissions: contents: read` (`build.yml:27-28`) is overridden inside the `build` job with `contents: write` (`:34-35`). `release-please.yml:45` sets `permissions: contents: write` only on `build-and-upload`, not `build-pr`. The `build-pr` job calls `build.yml` for release-please PRs — `softprops/action-gh-release@v2` will silently no-op there because `tag_name` is empty (gated by `if:` on `:189`), so no real damage, but the indirection makes auditing harder.
- Files: `.github/workflows/build.yml:27-35, 189-195`, `.github/workflows/release-please.yml:35-49`
- Fix approach: document the intended permissions matrix; consider explicit `permissions: {}` on the `build-pr` invocation.

**Stale "5-second timeout" tests still expected by Rust integration suite:**
- See above under "Tech Debt". This is also a bug because `cargo test` would fail.

**`flatpak/com.ks0555.robotcontroller.metainfo.xml` screenshot has no image URL:**
- Files: `flatpak/com.ks0555.robotcontroller.metainfo.xml:34-38`
- Symptoms: AppStream spec requires `<screenshot><image>URL</image></screenshot>`. Currently we have only `<caption>`. `appstream-util validate` would flag this — but appstream-util is not in CI (see Deferred Items).
- Trigger: any AppStream-aware software center (KDE Discover, GNOME Software) — the app will show with no preview.
- Fix approach: host a real screenshot (commit to repo and reference a raw GitHub URL, or `https://github.com/.../raw/main/docs/screenshot.png`); add the `<image>` element.

**`docs.test.ts` requires `org.gnome.Platform` to remain in `docs/ARCHITECTURE.md`:**
- Files: `apps/frontend/src/docs.test.ts:245-251`
- Symptoms: the test asserts `archMd.toContain("org.gnome.Platform")`. If someone correctly fixes the docs runtime drift (see "Tech Debt"), this test will fail.
- Trigger: running `pnpm test` after fixing doc drift.
- Fix approach: update test to assert the actual current runtime (`org.freedesktop.Platform`) before fixing the docs.

**`docs.test.ts` requires the `flatpak/README.md` to keep `--allow=bluetooth` and `--device=input` strings:** see "Tech Debt" — flatpak/README.md still contains both (lines 106, 117) but the manifest does not.

## Security Considerations

**BLE pairing — no PIN/authentication:**
- Risk: the BT24 module is paired by name alone (`apps/frontend/src-tauri/src/ble/mod.rs:13` `BT24_NAME = "BT24"`). `find_bt24` matches any peripheral whose `local_name` contains "BT24" (`:21`). Multiple BT24 robots in range, or a spoofed BLE advertisement, would be connected indistinguishably.
- Files: `apps/frontend/src-tauri/src/ble/mod.rs:13-29`
- Current mitigation: the channel is BT24 UART (no auth in firmware), so adding pairing would require firmware changes that the project says are off-limits. Realistically the threat model is "two robots in the same room" rather than active attack.
- Recommendations: at minimum show the BLE address in the UI so the user can confirm which device connected; allow a user-chosen device suffix filter.

**`--share=network` in Flatpak manifest:**
- Risk: `flatpak/com.ks0555.robotcontroller.yaml:27` grants full network access. The app does not actually need network at runtime (only at install time for fetching the runtime, which is outside the sandbox). The flatpak/README.md justification ("BlueZ D-Bus sometimes requires it") is unverified.
- Files: `flatpak/com.ks0555.robotcontroller.yaml:27`
- Current mitigation: none — broad permission.
- Recommendations: remove `--share=network` and validate via VAL-06/07 that BLE still works. Sideload-only distribution (per PROJECT.md key decision) means there's no Flathub gate to enforce this.

**`--device=all` over-permissions the sandbox:**
- Risk: `flatpak/com.ks0555.robotcontroller.yaml:30` grants access to ALL host devices (cameras, joysticks, /dev/dri, etc.). Docs claim `--device=input`. See Tech Debt for the drift.
- Files: `flatpak/com.ks0555.robotcontroller.yaml:30`
- Current mitigation: target user runs the app locally on their own machine; the sideload-only model limits blast radius. Still a deviation from "principle of least privilege" as advertised.
- Recommendations: switch to `--device=input` once VAL-07 validates the narrower grant works on SteamOS 3.6+ Flatpak 1.15.8.

**`set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1")` is unconditional in `main.rs`:**
- Risk: `apps/frontend/src-tauri/src/main.rs:6` runs `std::env::set_var` before any check. The Rust docs document that `std::env::set_var` is unsafe in multi-threaded contexts (and required `unsafe` in Rust 2024). The Tauri app starts single-threaded so this is currently fine on edition 2021.
- Files: `apps/frontend/src-tauri/src/main.rs:6`, `apps/frontend/src-tauri/src/lib.rs:38`
- Current mitigation: edition 2021 in `Cargo.toml:6` keeps the API safe.
- Recommendations: pin to `edition = "2021"` (already done) until we explicitly review for edition 2024 migration.

**`download_and_verify` warns instead of failing when checksum is missing:**
- Risk: `upgrade-robot-controller.sh:264-280` skips checksum validation if no `.sha256` is found and only `warn`s. A truncated release or MITM that strips the `.sha256` would silently install.
- Files: `upgrade-robot-controller.sh:264-280`
- Current mitigation: CI always uploads the `.sha256` (`build.yml:175-177`), so the missing-checksum branch is rare.
- Recommendations: change `warn ... skipping checksum verification` to `fail` once CI always publishes the `.sha256` (it does now).

**`curl ... | bash` install pattern in README:**
- Risk: `README.md:15-17` recommends `curl -fsSL https://raw.githubusercontent.com/.../upgrade-robot-controller.sh | bash`. Standard "install via pipe-to-bash" attack surface — a compromised raw.githubusercontent.com or DNS could inject arbitrary script.
- Files: `README.md:15-17`
- Current mitigation: documentation states the alternative "Manual install (no script)" path. GitHub HTTPS protects against MITM on the network.
- Recommendations: keep both paths documented; add a "Verify the script" instruction (`curl ... -o script.sh && cat script.sh && bash script.sh`) for security-conscious users.

## Performance Bottlenecks

**`ble_send` rediscovers services on every command:**
- Problem: `apps/frontend/src-tauri/src/ble/mod.rs:192-195` calls `peripheral.discover_services().await` on EVERY `ble_send` call. GATT service discovery is expensive (50-200 ms typical, plus BlueZ round trips). With a low-deadzone gamepad streaming F/B/L/R/S transitions, this dominates command latency.
- Files: `apps/frontend/src-tauri/src/ble/mod.rs:175-218`
- Cause: discovery should happen once on connect (`ble_connect` already does this at line 81-83), and the resolved `Characteristic` (or the `chars.iter().find(...)` result) should be cached on `BleState` along with the `Peripheral`.
- Improvement path: extend `BleState` (`apps/frontend/src-tauri/src/ble/state.rs:4-7`) to also hold the resolved characteristic (or a tiny struct `{ peripheral, characteristic }`). Set it in `ble_connect` after discovery; consume it in `ble_send` without re-discovery. Expected: 50-200 ms reduction in command latency per send.

**Gamepad poll sleeps 8 ms in a busy loop:**
- Problem: `apps/frontend/src-tauri/src/gamepad/mod.rs:213` uses `std::thread::sleep(Duration::from_millis(8))` after draining `gilrs.next_event()`. 8 ms is ~125 Hz polling — fine, but the loop is a fixed cadence rather than event-driven.
- Files: `apps/frontend/src-tauri/src/gamepad/mod.rs:141-214`
- Cause: `gilrs::next_event()` is non-blocking. There's no async/await on gilrs — true event-driven would require `gilrs::Gilrs::next_event_blocking` (also exists) or epoll on /dev/input/event* directly.
- Improvement path: switch to `gilrs.next_event_blocking()` to get OS-driven wakeups; reduces CPU usage and improves worst-case latency by ~4 ms.

**`setup_event_listener` creates a SECOND BLE Manager:**
- Problem: `apps/frontend/src-tauri/src/ble/mod.rs:128-151` spawns a task that calls `Manager::new()` again (separate from `ble_connect`'s Manager at `:36`). Two BlueZ D-Bus connections, two event subscriptions, two adapter handles.
- Files: `apps/frontend/src-tauri/src/ble/mod.rs:128-151`
- Cause: the listener was added before `BleState` was extended; rather than sharing the adapter, a fresh one was created.
- Improvement path: share the adapter via `BleState` (extend it to also hold the `Adapter`), or move event subscription into `ble_connect` and feed disconnect events through the same `events` stream that scans for the peripheral. Reduces resource use; small impact on latency but cleaner concurrency.

**Async BLE write is fire-and-forget on the frontend:**
- Problem: `apps/frontend/src/hooks/use-bluetooth.ts:126` does `void invoke("ble_send", { command: data })`. If the BLE link drops between commands, no error surfaces back to the UI for the dropped command — only the next state event will reveal "disconnected".
- Files: `apps/frontend/src/hooks/use-bluetooth.ts:124-133`
- Cause: design choice for low latency — awaiting the round trip would gate the next gamepad frame.
- Improvement path: keep fire-and-forget for normal cadence, but `console.warn` from the `invoke().catch(...)` so that BLE errors are at least logged in the WebView dev tools.

## Fragile Areas

**Hook return shape is invariant across milestone:**
- Files: `apps/frontend/src/hooks/use-bluetooth.ts:135-142`, `apps/frontend/src/hooks/use-gamepad.ts:72`, `apps/frontend/src/app.tsx:12-13`
- Why fragile: PROJECT.md key decision "Keep hook return shapes stable" is enforced only by `ci.yml:34-35` `git diff --exit-code -- apps/frontend/src/app.tsx`. Any extra field in the hook return is permitted (e.g., `unsupported`, `error`, `isDeck`) as long as `app.tsx` doesn't destructure new fields. But there's no test that the hook DELETES a previously-exposed field, so a refactor that drops `error` from `useBluetooth` would silently break `app.tsx:12` runtime even though git-diff would pass.
- Safe modification: add or rename — yes. Remove a returned field — only after grepping `app.tsx`, `control-pad.tsx`, `status-bar.tsx` for usage. Better: extract a `useBluetoothReturn` interface and assert structurally.
- Test coverage: `apps/frontend/src/App.test.tsx` mocks `useBluetooth` and `useGamepad`, so it does NOT exercise the actual return shape against the real hook implementations.

**`btleplug` platform quirks:**
- Files: `apps/frontend/src-tauri/src/ble/mod.rs:36-126`
- Why fragile: `btleplug` 0.12 abstracts over BlueZ / CoreBluetooth / WinRT, but each backend has quirks. The current scan loop combines event subscription with a 500 ms polling fallback (`:94`) specifically to work around BlueZ's "DeviceDiscovered fires once" behaviour. macOS CoreBluetooth fires DeviceUpdated on every advertisement; Windows is somewhere in between. The 5/10 s timeout has had to be tuned over multiple iterations (`SCAN_TIMEOUT` changed from 5→10 s after VAL-04 testing).
- Safe modification: keep the polling fallback even if you "fix" the event subscription. Test on Linux (BlueZ) AND macOS before merging changes to the scan loop.
- Test coverage: zero — `ble/mod.rs::ble_connect` has no unit tests (only file-grep "integration tests"). VAL-06 covers this manually but is deferred.

**`gilrs` on Steam Deck + Gamescope + Steam Input:**
- Files: `apps/frontend/src-tauri/src/gamepad/mod.rs:121-214`
- Why fragile: gilrs uses udev/evdev on Linux. Steam Input on the Deck remaps the physical controller into a virtual device that may or may not appear in evdev depending on whether the app is "added as a Non-Steam Game". In Desktop Mode it's one device; in Gaming Mode it's another. Quick task `260511-001` ("Fix D-pad not working in gaming mode") in STATE.md:99 was a fix specifically for this — `compute_direction` (`gamepad/mod.rs:51-112`) now reads both `Axis::DPadX/Y` AND `Button::DPadUp/Down/Left/Right` because different modes expose the D-pad differently.
- Safe modification: any change to the gamepad input handling MUST be tested in both Desktop Mode and Gaming Mode on a real Deck. The unit tests (`gamepad/mod.rs:223-283`) only cover `get_direction_from_axes`, not the dpad/stick fallback chain.
- Test coverage: 8 axis-direction tests; the D-pad button fallback path (`:66-90`) has zero tests.

**Tauri capabilities ACL is duplicated across `default.toml`, `ble.toml`, and `capabilities/main.json`:**
- Files: `apps/frontend/src-tauri/permissions/default.toml`, `apps/frontend/src-tauri/permissions/ble.toml`, `apps/frontend/src-tauri/capabilities/main.json`
- Why fragile: the same four permission identifiers (`ble-connect`, `ble-disconnect`, `ble-send`, `ble-state-changed`) are listed in three places. Forgetting one when adding a new command silently fails at invoke-time with `command X not allowed`.
- Safe modification: when adding a new Tauri command, update (1) the `#[tauri::command]` annotation, (2) `invoke_handler` in `lib.rs:54-58`, (3) `permissions/ble.toml`, (4) `permissions/default.toml`, (5) `capabilities/main.json`.
- Test coverage: zero — the file-grep tests look for specific names. Add a Cargo build-time check that asserts `capabilities/main.json::permissions` is a superset of `default.toml::default::permissions`.

**`vite.config.ts` build target depends on env var that may not be set:**
- Files: `apps/frontend/vite.config.ts:23-26`
- Why fragile: `process.env.TAURI_ENV_PLATFORM === "windows"` controls JS build target; if Tauri CLI changes the env var name (it has happened in past Tauri versions), the conditional silently picks `"safari15"` which still works on WebKitGTK. But the macOS/Linux distinction relies on the env var being set correctly.
- Safe modification: avoid changing the env var name without checking with current Tauri CLI version.
- Test coverage: `apps/frontend/src/tauri-frontend.test.ts:31-54` only asserts strings in `vite.config.ts`, not behavior.

**`.husky/` shims with `lefthook` underneath:**
- Files: `.husky/`, `lefthook.yml`
- Why fragile: AGENTS.md:20 says ".husky/ shims delegate to lefthook". This dual-tooling means a `package.json::scripts.prepare = "lefthook install"` is supposed to overwrite `.husky/` content, but if a contributor uses a different node version or skips `pnpm install`, the husky shims may go stale.
- Safe modification: don't manually edit `.husky/` files; trust the `lefthook install` step.
- Test coverage: zero — pre-commit hook firing is not asserted by CI.

**`upgrade-robot-controller.sh` uses unquoted word-split with `set -u`:**
- Files: `upgrade-robot-controller.sh:234-246`
- Why fragile: `local IFS=.; local i_ver=(${installed})` (unquoted) and `local iv="${i_ver[$i]:-0}"`. The unquoted expansion under `set -u` is okay because `installed` is guaranteed non-empty by the earlier checks, but if a future change introduces a path where `installed` is `""`, the script will error out instead of degrading gracefully.
- Safe modification: keep the early `installed == "none"` guard at `:220-222`.

## Scaling Limits

The app is intentionally single-user, single-device, single-binary. There are no real scaling concerns; the closest analogue is:

**Single BLE peripheral in `BleState`:**
- Current capacity: exactly one connected BT24 peripheral at a time (`apps/frontend/src-tauri/src/ble/state.rs:5` `Option<Peripheral>`).
- Limit: cannot drive two robots simultaneously.
- Scaling path: switch `Option<Peripheral>` → `HashMap<String, Peripheral>` keyed by BLE address; route `ble_send` by id. Out of scope per PROJECT.md "Out of Scope".

**Single gamepad in `connected_gamepad_id`:**
- Current capacity: exactly one gamepad (`apps/frontend/src-tauri/src/gamepad/mod.rs:124-152`, "first one wins" via D-09/D-11).
- Limit: ignores secondary gamepads even if the user wanted two-player co-op.
- Scaling path: not relevant for current product.

## Dependencies at Risk

**`@tauri-apps/api ^2.11.0` / `tauri ^2.11.0`:**
- Risk: Tauri v2 is current stable but breaking changes within 2.x have happened (e.g., `withGlobalTauri` default change that motivated `__TAURI_INTERNALS__` detection — see `apps/frontend/src/hooks/use-bluetooth.ts:11-23`). Auto-bumping minor versions could regress.
- Files: `apps/frontend/package.json:18, 26`, `apps/frontend/src-tauri/Cargo.toml:16`
- Impact: silent BLE connect failure under previous bug; the comment in `use-bluetooth.ts:11-23` documents the root cause.
- Migration plan: pin to a known-good minor (`~2.11.0` instead of `^2.11.0`) until the next milestone explicitly tests upgrade.

**`btleplug ^0.12.0`:**
- Risk: pre-1.0 crate (0.12.0), breaking changes possible at each minor bump. The crate had a major API shift at 0.11.0.
- Files: `apps/frontend/src-tauri/Cargo.toml:21`
- Impact: a `cargo update` could break the BLE path; no integration tests catch it.
- Migration plan: pin to `=0.12.0` until upstream commits to a 1.0; budget review at each minor.

**`gilrs ^0.11.1`:**
- Risk: similar pre-1.0 — at the time of analysis, gilrs is at 0.11.x. Steam Deck quirks were fixed across 0.10→0.11 (D-pad axis support). The Linux-only redundant declaration (`Cargo.toml:34-36`) means even patch bumps need attention.
- Files: `apps/frontend/src-tauri/Cargo.toml:24, 36`
- Migration plan: review on each minor; specifically test D-pad behaviour after upgrade.

**`vitest ^4.1.5` (pre-stable major):**
- Risk: Vitest 4 was released relatively recently and may have ecosystem incompatibilities with `@testing-library/react@^16` and `jsdom@^29`.
- Files: `apps/frontend/package.json:37, 27-28, 33`
- Migration plan: pinned to `^4.1.5`; verify on each pnpm update.

**`pnpm@10.29.3`:**
- Risk: pinned exactly in root `package.json:20`. pnpm 10 introduced breaking changes around lockfile format.
- Migration plan: any bump must regenerate `pnpm-lock.yaml` and re-run full CI.

## Missing Critical Features

**No motor speed control (u/v commands):**
- Problem: documented as out of scope (PROJECT.md:80), but mentioned as a candidate for v2.2.
- Blocks: nuanced robot control; current binary forward/back/left/right/stop is the only motion.
- Plan: deferred — gamepad analog stick magnitude could be mapped to `u<0-255>#`/`v<0-255>#` Arduino commands; firmware accepts them but the spec was kept binary.

**No auto-reconnect on BLE disconnect:**
- Problem: D-01 in `apps/frontend/src-tauri/tests/ble_event_test.rs:69-77` is "Auto-reconnect mentioned for future implementation". `setup_event_listener` (`apps/frontend/src-tauri/src/ble/mod.rs:128-151`) emits `disconnected` but does not attempt to reconnect. User must click "Connect Bluetooth" again.
- Blocks: smooth UX in the face of momentary BT24 dropout (common during high-RF environments).
- Plan: candidate for next milestone. Exponential backoff + UI countdown.

**No "saved last device" between sessions:**
- Problem: every cold start requires a fresh BLE scan (10 s timeout). The app has no persistent storage.
- Blocks: snappy reconnect after restart.
- Plan: Tauri's `app_data_dir` could store the last-connected BLE address; skip scan and go straight to `connect()` on next launch.

## Test Coverage Gaps

**Real BLE behaviour:**
- What's not tested: `ble_connect`, `ble_disconnect`, `ble_send` actual code paths. Only string-greps in `apps/frontend/src-tauri/tests/*.rs` and Tauri-mocked Vitest paths in `apps/frontend/src/hooks/use-bluetooth.test.ts:150-300`.
- Files: `apps/frontend/src-tauri/src/ble/mod.rs:31-218`
- Risk: untested D-Bus interactions, untested timeout handling, untested re-discover-then-write path. A regression that breaks the BLE handshake would only surface in VAL-06 (deferred).
- Priority: HIGH. Add a `tokio::test` + `mockall` or behind-`#[ignore]` integration suite that runs against a real adapter when present.

**Gamepad D-pad button fallback:**
- What's not tested: the entire `compute_direction` function (`apps/frontend/src-tauri/src/gamepad/mod.rs:51-112`). Only `get_direction_from_axes` (a pure function) has tests at `:223-283`.
- Files: `apps/frontend/src-tauri/src/gamepad/mod.rs:51-112`
- Risk: D-pad axis-vs-button selection logic broke recently (`260511-001` Quick task fix). Easy to regress.
- Priority: HIGH. Add tests that feed mock `gilrs::Gamepad` states (axis + button) into `compute_direction`. May require a tiny trait wrapper to mock.

**Flatpak sandbox finish-args:**
- What's not tested: actual sandbox behaviour. `flatpak_sandbox_test.rs:1-278` is all file-grep on the manifest. No `flatpak run` in CI.
- Files: `apps/frontend/src-tauri/tests/flatpak_sandbox_test.rs`, `flatpak/com.ks0555.robotcontroller.yaml`
- Risk: a finish-arg typo would pass tests and fail at runtime in the sandbox. The tests also assert finish-args that aren't there (see Tech Debt).
- Priority: MEDIUM. Add a CI step that runs `flatpak run com.ks0555.robotcontroller --command=true` after install and asserts the binary launches (xvfb-run).

**`upgrade-robot-controller.sh` end-to-end:**
- What's not tested: the script's install path. `apps/frontend/src/deployment.test.ts:1-93` only asserts string presence (`set -euo pipefail`, `--check`, etc.) — never executes the script.
- Files: `upgrade-robot-controller.sh:1-397`, `apps/frontend/src/deployment.test.ts`
- Risk: the `[ "${installed}" = "installed"* ]` bug (see Known Bugs) has been there since the script was added.
- Priority: MEDIUM. Add `flatpak/tests/verify-upgrade.sh` that mocks `flatpak info`/`curl` and runs through both fresh-install and upgrade paths.

**Build-system version extraction:**
- What's not tested: `build.yml:148` `grep '^version' apps/frontend/src-tauri/Cargo.toml | head -1 | sed 's/.*"\(.*\)".*/\1/'`. Will return `"0.1.21"` correctly today, but Cargo.toml could legitimately have a `[package.metadata]` section with `version` later.
- Files: `.github/workflows/build.yml:139-150`
- Risk: silent extraction of the wrong version; uploaded artifact named incorrectly.
- Priority: LOW. Replace with `cargo metadata --no-deps | jq -r '.packages[0].version'` (more robust; jq is already a CI dep).

**Visual / Tauri runtime tests:**
- What's not tested: actually rendering the Tauri webview, button hover/active states, accessibility (ARIA live regions, keyboard navigation between control-pad buttons).
- Files: `apps/frontend/src/components/control-pad.tsx`, `apps/frontend/src/components/status-bar.tsx`
- Risk: regressions in dark-mode contrast, focus order, screen reader labels.
- Priority: LOW for v2.x — single-user kiosk-like app. Worth revisiting if accessibility becomes a requirement.

**Pre-commit hook coverage of `app.tsx` lock:**
- What's not tested: the actual lefthook config doesn't lock `app.tsx`. Only the CI step (`ci.yml:34-35`) enforces it.
- Files: `lefthook.yml:1-15`
- Risk: a developer pushing directly to main (allowed for tags / release-please merges) bypasses the lock.
- Priority: LOW. See VAL-08 in Deferred Items.

---

*Concerns audit: 2026-05-14*
