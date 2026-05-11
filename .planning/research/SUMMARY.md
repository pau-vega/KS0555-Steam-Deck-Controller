# Project Research Summary

**Project:** v2.1 Flatpak Packaging — KS0555 Steam Deck Robot Controller
**Domain:** Linux desktop app distribution (packaging an existing Tauri v2 + btleplug + gilrs app as a Flatpak bundle for sideload onto Steam Deck)
**Researched:** 2026-05-09
**Confidence:** HIGH

## Executive Summary

This milestone adds a packaging/distribution layer; the runtime architecture (single Tauri v2 process, Rust-owned BLE + gamepad, React frontend) is unchanged. The work splits cleanly into four concerns: (1) switching `bundle.targets` from `["appimage"]` to `["deb"]` so `flatpak-builder` has an input artifact, (2) writing a Flatpak manifest that extracts the `.deb` into `/app/` and applies sandbox `finish-args` for BLE + gamepad, (3) reworking CI to build `.flatpak` instead of `.AppImage`, and (4) documenting the sideload + "Add as Non-Steam Game" workflow on Steam Deck. Tauri v2 has **no native flatpak bundle target** — the official Tauri guide and discussion #4426 prescribe the deb-extraction pattern.

The recommended approach is the deb-extract path with a single-file `.flatpak` produced by `flatpak build-bundle`, distributed as a GitHub Release asset. CI uses `flatpak/flatpak-github-actions/flatpak-builder@v6.7` running inside the Flathub-maintained container image. The two highest-risk areas are (a) BLE under the Flatpak sandbox: btleplug talks to BlueZ on the **system** D-Bus, requires `--system-talk-name=org.bluez` (NOT `--talk-name` and NOT `--device=bluetooth`), and the existing `lib.rs` `DBUS_SYSTEM_BUS_ADDRESS=/run/host/...` rewrite must be gated on `!in_flatpak` or it will silently break BLE; and (b) gamepad/evdev: gilrs requires `--device=input` (Flatpak ≥1.15.6) or fallback `--device=all`.

**Critical scope contradiction surfaced:** PROJECT.md lists "Auto-update workflow (`flatpak update`) documented or scripted" as Active, while listing "Self-hosted Flatpak repo" as Out of Scope. These are mutually exclusive — `flatpak update` requires a remote with a collection ID. Honest delivery is "manual upgrade workflow (`flatpak install --user --reinstall`) documented", optionally augmented with a launcher script polling GitHub Releases. **Resolve before docs phase.**

A second, smaller contradiction: stack research recommends `org.freedesktop.Platform//24.08` (smaller, no GNOME deps); architecture research uses the official Tauri sample's `org.gnome.Platform//46`. **Pick one in Phase 11** and stay consistent across manifest + CI.

## Key Findings

### Recommended Stack

The Flatpak pipeline lives outside Tauri's CLI: `cargo tauri build --bundles deb` produces a `.deb`, and `flatpak-builder` consumes it as a `type: file` source — extracting with `ar` + `tar` and installing into `/app/bin`, `/app/share/applications`, `/app/share/icons`. No Rust SDK extension, no offline cargo/node generators, no `flatpak-cargo-generator` are needed.

**Core technologies:**
- **`flatpak-builder` 1.4.8** — Builds the bundle from a YAML manifest. Consumed via the maintained GitHub Actions wrapper.
- **`org.freedesktop.Platform//24.08` (recommended) OR `org.gnome.Platform//46`** — Runtime supplying WebKitGTK + GTK to Tauri. Decision must be made in Phase 11.
- **`flatpak/flatpak-github-actions/flatpak-builder@v6.7`** — Upstream action (`flathub-infra` fork archived Apr 2025).
- **`flatpak build-bundle`** — Converts OSTree repo to single `.flatpak` for sideload.
- **Stock `cargo install tauri-cli` (drop `feat/truly-portable-appimage` fork)** — Custom fork only matters for AppImage's sharun format.

Detail: `.planning/research/STACK.md`.

### Expected Features

**Must have (table stakes):**
- Switch `tauri.conf.json` `bundle.targets` from `["appimage"]` to `["deb"]`
- Flatpak manifest at `flatpak/com.ks0555.robotcontroller.yaml`
- AppStream metainfo at `flatpak/com.ks0555.robotcontroller.metainfo.xml` (required by flatpak-builder)
- finish-args: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`, `--share=network`
- BLE finish-args: `--system-talk-name=org.bluez` + `--system-talk-name=org.bluez.*` + `--allow=bluetooth`
- Gamepad finish-args: `--device=input` with `--device=all` documented fallback
- `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` (belt-and-suspenders alongside Rust `set_var`)
- `.desktop` renamed/relocated; hicolor icons (32, 128, 256@2) extracted from deb
- Single-file `.flatpak` bundle attached to GitHub Release
- README: sideload via `flatpak install --user` (NEVER `--system` on Deck)
- "Add as Non-Steam Game" walkthrough tested in Gaming Mode

**Should have:**
- Auto-update launcher script (curl latest `.flatpak` → `flatpak install --user --reinstall`)
- Tighten `--device=all` → `--device=input` once SteamOS Flatpak version confirmed ≥1.15.6
- Drop `--share=network` if production CSP audit confirms no HTTP/WS in prod build
- `justfile` recipes (`flatpak-build`, `flatpak-install`, `flatpak-deploy`)

**Defer (v2.2+):**
- Self-hosted OSTree repo, Flathub submission, ARM64/Snap/AUR packaging

**Anti-features (actively wrong):**
- `--filesystem=home` / `--filesystem=host` (defeats sandbox)
- `--device=bluetooth` (wrong stack — that's AF_BLUETOOTH; btleplug uses D-Bus)
- `--talk-name=org.bluez` (wrong bus — BlueZ is system bus)
- `--socket=session-bus` / `--socket=pulseaudio` / tray-icon args
- `org.freedesktop.Flatpak` portal grant (sandbox escape)

Detail: `.planning/research/FEATURES.md`.

### Architecture Approach

"Wrap the deb": Tauri produces `.deb`, `flatpak-builder` consumes as local file source, extracts into `/app/`, applies `finish-args`, emits OSTree repo. `flatpak build-bundle` collapses repo into single-file `.flatpak`. Distribution via GitHub Release; install on Deck `flatpak install --user`; launch via `.desktop` exported to `~/.local/share/flatpak/exports/share/applications/`.

**Major components:**
1. **Tauri CLI (`cargo tauri build --bundles deb`)** — Existing toolchain; only bundle target name changes.
2. **`flatpak/` directory at repo root (NEW)** — `com.ks0555.robotcontroller.yaml`, `com.ks0555.robotcontroller.metainfo.xml`, `build.sh`, `README.md`.
3. **`flatpak-builder` + `flatpak build-bundle`** — Run in CI inside Flathub container image.
4. **GitHub Actions `build-flatpak` job (NEW)** — Replaces `build-x64` AppImage job. Drops `build-arm64`. `build-macos` untouched.
5. **`lib.rs` D-Bus address rewrite (TOUCHED)** — Existing `/run/host/run/dbus/system_bus_socket` fallback gated on `!in_flatpak` (detect via `/.flatpak-info` or `FLATPAK_ID`).

**Identifier hygiene:** `tauri.conf.json` `identifier`, manifest `id`, AppStream `<id>`, `.desktop` basename all = `com.ks0555.robotcontroller`. Deb's `.desktop` named `robot-controller.desktop` — manifest's `build-commands` must `mv` + `sed` to Flatpak ID.

Detail: `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls

1. **`lib.rs` D-Bus rewrite + missing `--system-talk-name=org.bluez`** — Single biggest integration risk. Existing Steam-Deck/AppImage workaround MUST be gated `!in_flatpak`. Symptom: scan starts, no devices, no error. Fix in same PR as manifest finish-args.
2. **`bundle.targets: ["flatpak"]` doesn't exist** — Tauri CLI accepts only `deb|rpm|appimage`.
3. **`--device=input` vs `--device=all` on real Decks** — `--device=input` (Flatpak 1.15.6+) is correct least-privilege; older SteamOS may ship 1.14.x. Test on real Deck.
4. **Sideload bundles do NOT auto-update** — `flatpak update` no-op. Resolve PROJECT.md contradiction.
5. **CI on `ubuntu-24.04` apt-installed `flatpak-builder` is broken** — cgroup v2 / bwrap issues. Use `flatpak-github-actions/flatpak-builder@v6.7` with Flathub container.
6. **`WEBKIT_DISABLE_COMPOSITING_MODE` only set in Rust is brittle in Gaming Mode** — Set BOTH via Rust `set_var` AND `--env=` in manifest.
7. **`sudo flatpak install` (system scope) on Steam Deck** — `/var/lib/flatpak` wiped by atomic updates. Always `--user`.
8. **Removing AppImage in same PR as Flatpak** — No fallback. Keep both for at least one transition release.

13 pitfalls catalogued, indexed to phases. Detail: `.planning/research/PITFALLS.md`.

## Implications for Roadmap

Sequence: build input artifact → wrap → sandbox correctly → verify on real Deck → automate in CI → finalize docs.

### Phase 11: Bundle pipeline restructure
**Delivers:** `tauri.conf.json` `bundle.targets: ["deb"]`; local `cargo tauri build` produces working `.deb`; `dpkg -c` recorded; runtime decision (freedesktop 24.08 vs GNOME 46) committed.
**Avoids:** Pitfalls #1, #9.
**Notable:** Drop `feat/truly-portable-appimage` custom tauri-cli fork. Drop `build-arm64` plans.

### Phase 12: Manifest + AppStream + local build
**Delivers:** `flatpak/com.ks0555.robotcontroller.yaml`, `com.ks0555.robotcontroller.metainfo.xml`, `build.sh`, `README.md`. Local `flatpak run com.ks0555.robotcontroller` opens window on Linux dev box.
**Avoids:** Pitfalls #6, #9, AppStream-optional misconception.

### Phase 13: Sandbox permissions for BLE + gamepad (load-bearing)
**Delivers:** Full finish-args set (BLE: `--system-talk-name=org.bluez` + `org.bluez.*`, `--allow=bluetooth`, `--share=network`; gamepad: `--device=input` with fallback; display: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`, `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1`). `lib.rs` D-Bus rewrite gated on `!in_flatpak`. Local `flatpak run` connects to BT24 + sees gamepad.
**Avoids:** Pitfalls #2, #3, #4, #13.

### Phase 14: Steam Deck on-device validation (Desktop + Gaming Mode)
**Delivers:** `scp`-and-install on real Deck succeeds; "Add as Non-Steam Game" picks up `.desktop`; Gaming Mode launches no black screen; BLE connects; gamepad drives robot. Test artifacts: log captures.
**Avoids:** Pitfalls #5, #6, #8.

### Phase 15: CI migration (parallel-run window)
**Delivers:** `.github/workflows/build.yml` adds `build-flatpak-x64` job (`flatpak-github-actions/flatpak-builder@v6.7` + Flathub container + OSTree cache). AppImage `build-x64` kept for ≥1 transition release. `build-arm64` dropped. `build-macos` untouched.
**Avoids:** Pitfalls #10, #11.

### Phase 16: AppImage decommission + update workflow docs
**Delivers:** AppImage CI deleted (separate PR). README upgrade-path documents `flatpak install --user --reinstall`. Optional: launcher script polling GitHub Releases.
**Avoids:** Pitfalls #7, #11.
**Notable:** PROJECT.md "Active" requirement amended: "Manual upgrade workflow (`flatpak install --user --reinstall`) documented; optional GitHub Releases polling launcher script provided".

### Research Flags

Phases needing deeper research during planning:
- **Phase 13** — sandbox permissions; deep-dive `org.bluez` wildcard, SteamOS Flatpak version, `--share=network` for AF_BLUETOOTH, `/.flatpak-info` detection.
- **Phase 14** — Gaming Mode validation; needs real Deck + documented test plan.
- **Phase 16** — update workflow; resolve PROJECT.md contradiction first.

Standard patterns (skip research):
- **Phase 11, 12, 15** — Tauri Flatpak doc + STACK/ARCHITECTURE skeletons cover end-to-end.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Cross-verified Tauri/Flatpak/Flathub repos. Versions pinned. One open decision (runtime choice). |
| Features | HIGH | Sandbox permissions anchored in official docs. Auto-update interpretation flagged. |
| Architecture | HIGH | Recommended pattern is official Tauri v2 pattern. Two MEDIUM sub-points. |
| Pitfalls | HIGH | 13 pitfalls catalogued, phase-mapped. Two MEDIUM caveats. |

**Overall confidence:** HIGH

### Gaps to Address

1. **Auto-update contradiction (PROJECT.md).** Amend "Active" requirement before Phase 16.
2. **Runtime choice (freedesktop 24.08 vs GNOME 46).** Decide in Phase 11. Recommend freedesktop unless missing-library issue surfaces in Phase 12.
3. **SteamOS Flatpak version for `--device=input`.** Empirical, test on target Deck.
4. **`.flatpak` signing.** Optional for sideload; quick spike if surfaced in Phase 16.
5. **`org.bluez` wildcard form.** Empirical, validate in Phase 13 with `dbus-monitor`.

## Sources

### Primary (HIGH)
- [Tauri v2 Flatpak distribution doc](https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx)
- [Tauri v2 CLI reference](https://v2.tauri.app/reference/cli/)
- [Tauri issue #3619](https://github.com/tauri-apps/tauri/issues/3619), [Discussion #4426](https://github.com/tauri-apps/tauri/discussions/4426)
- [Flatpak Sandbox Permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html)
- [Flatpak Single-file bundles](https://docs.flatpak.org/en/latest/single-file-bundles.html)
- [Flatpak Available Runtimes](https://docs.flatpak.org/en/latest/available-runtimes.html)
- [flatpak/flatpak-github-actions v6.7](https://github.com/flatpak/flatpak-github-actions)

### Secondary (MEDIUM)
- [Vincent Jousse: Packaging Tauri v2 for Flatpak](https://vincent.jousse.org/blog/en/packaging-tauri-v2-flatpak-snapcraft-elm/)
- [Flatpak issue #1719: bluetooth permission](https://github.com/flatpak/flatpak/issues/1719)
- [Flathub Discourse — `device=input`](https://discourse.flathub.org/t/support-for-device-input/6645)
- [BoilR: Flatpak as Non-Steam game](https://github.com/PhilipK/BoilR/discussions/425)
- [PulseGeek: Flatpak commands cheat sheet for Steam Deck](https://pulsegeek.com/articles/flatpak-commands-cheat-sheet-for-steam-deck/)

### Tertiary (LOW — needs in-phase validation)
- SteamOS shipping Flatpak version on user channels — confirm on-Deck Phase 13/14
- Exact `.deb` internal path layout (current Tauri version) — confirm `dpkg -c` Phase 11
- `--system-talk-name=org.bluez.*` wildcard requirement — confirm `dbus-monitor` Phase 13

---
*Research completed: 2026-05-09*
*Ready for roadmap: yes*
