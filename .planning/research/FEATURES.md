# Feature Research

**Domain:** Flatpak packaging for an existing Tauri v2 desktop app on Steam Deck (sideload-only, replaces AppImage)
**Researched:** 2026-05-09
**Confidence:** HIGH (Flatpak sandbox semantics, Tauri v2 manifest pattern, Steam Deck non-Steam game flow all verified against official docs and Tauri's own v2 distribution doc)

## Scope Reminder (from milestone context)

- Sideload-only: install via `flatpak install --user app.flatpak` from a single-file bundle
- No Flathub submission, no self-hosted Flatpak repo
- Replace AppImage entirely in CI (`apps/frontend/src-tauri/tauri.conf.json` `bundle.targets` currently `["appimage"]`)
- Existing capabilities the package must preserve: BLE via `btleplug` → BlueZ on system bus, gamepad via `gilrs` → evdev (`/dev/input/*`), Vite/React UI in WebKitGTK, no tray icon, no auto-launch
- "Add as Non-Steam Game" from Desktop Mode → launch from Gaming Mode with controller passthrough
- Auto-update on launch is a target

## Feature Landscape

### Table Stakes (Required for the Steam Deck robot controller to work)

These are non-negotiable. Missing any of them = the existing v2.0 app stops working when shipped as a Flatpak.

| Feature | Why Expected | Complexity | Notes / Justification |
|---------|--------------|------------|-----------------------|
| **Tauri v2 → Flatpak bundle pipeline** | Replaces AppImage; CI must produce a `.flatpak` artifact | MEDIUM | Tauri v2 has no native flatpak bundle target. Standard pattern (per Tauri's own v2 docs, `tauri-docs/src/content/docs/distribute/flatpak.mdx`): keep `bundle.targets = ["deb"]` and use `flatpak-builder` to extract the `.deb` into `/app/bin` + `/app/lib/<product_name>`. Bundle to single file with `flatpak build-bundle`. Depends on existing `tauri.conf.json` bundle config — change `appimage` → `deb` |
| **GNOME runtime (`org.gnome.Platform` 46+)** | Tauri uses WebKitGTK + GTK; needs the matching SDK | LOW | Tauri's official doc uses `org.gnome.Platform` runtime-version `46`, `org.gnome.Sdk`. WebKitGTK 4.1 ships with this runtime |
| **`--socket=wayland` + `--socket=fallback-x11`** | Window must display under Gamescope (Wayland) and Plasma X11 sessions | LOW | Steam Deck Gaming Mode is Gamescope/Wayland; Desktop Mode is Plasma/X11. Both required. The existing `WEBKIT_DISABLE_COMPOSITING_MODE=1` Gamescope workaround in `gamepad/mod.rs` continues to apply inside the sandbox |
| **`--device=dri`** | WebKitGTK needs GPU access to render | LOW | OpenGL/DRM access for the WebView. Without it the window may fail to render or fall back to slow software |
| **`--share=ipc`** | Required for X11 fallback (MIT-SHM) and shared memory | LOW | Standard for any GUI app; fallback-x11 will silently underperform without it |
| **`--share=network`** | Pending audit — current CSP allows `connect-src 'self' http://localhost:5173 ws://localhost:5173` (dev only) | LOW | Listed as TABLE STAKES pending verification at packaging time. **If the production build does NOT use HTTP/WS, downgrade to ANTI-FEATURE** (don't grant). Robot communication is local BLE only — network grant is likely unneeded in prod |
| **`--system-talk-name=org.bluez`** | btleplug talks to BlueZ on the system D-Bus | LOW | Verified: standard Flatpak pattern for BLE. Maps directly to `apps/frontend/src-tauri/src/ble/mod.rs` calling btleplug → BlueZ. `--allow=bluetooth` alone is insufficient for D-Bus calls; `--system-talk-name=org.bluez` is the load-bearing one |
| **`--allow=bluetooth`** | Pairs with `--system-talk-name=org.bluez` for full BLE access | LOW | Combined with the system-talk-name. Both are standard for Bluetooth Flatpaks |
| **Gamepad/evdev access** | gilrs reads `/dev/input/event*` for the Steam Deck built-in controller | LOW (with caveat) | Two options: `--device=input` (Flatpak ≥1.15.6 / 1.16, narrow scope, evdev only) OR `--device=all` (older Flatpak, also exposes /dev/dri etc.). **SteamOS Flatpak version varies; Flatpak 1.15.6 not guaranteed on all Decks.** Recommend `--device=all` for maximum SteamOS compatibility, with a note to migrate later |
| **`.desktop` file with correct identifier** | Steam "Add as Non-Steam Game" picker reads `~/.local/share/flatpak/exports/share/applications/` | LOW | Must be `com.ks0555.robotcontroller.desktop` (matching `identifier` in tauri.conf.json) and installed at `/app/share/applications/com.ks0555.robotcontroller.desktop`. Tauri's `.deb` produces a desktop file; flatpak-builder must `sed` the `Icon=` line to match the flatpak ID |
| **Hicolor icons (32, 128, 256@2)** | Required by Flatpak conventions; Steam grid pulls from these | LOW | Already shipped via `tauri.conf.json`'s `bundle.icon = ["icons/icon.png"]`. flatpak-builder copies into `/app/share/icons/hicolor/<size>/apps/com.ks0555.robotcontroller.png` |
| **Single-file bundle output (`.flatpak`)** | Sideload distribution mechanism | LOW | `flatpak build-bundle` produces one file. Install with `flatpak install --user ./robot-controller.flatpak`. Confirmed by Flatpak docs: `--bundle` flag is implied by `.flatpak` extension |
| **GNOME runtime resolvable on target Deck** | `flatpak install --user <bundle>` needs the runtime present locally | LOW | If runtime is missing, `flatpak install` prompts to add `flathub` to fetch `org.gnome.Platform//46`. **Steam Deck has Flathub pre-configured in Discover**, so it just works on a typical Deck. Document the prerequisite |
| **Replace `bundle.targets: ["appimage"]` with `["deb"]` in `tauri.conf.json`** | flatpak-builder consumes the .deb | LOW | Direct dep on existing config file. Existing `bundle.linux.appimage.bundleMediaFramework: false` block becomes irrelevant and should be removed |
| **CI artifact change in `.github/workflows/build.yml`** | Existing workflow builds AppImage via tauri-action; must produce `.flatpak` instead | MEDIUM | Standard pattern: install `flatpak`, `flatpak-builder`, `org.gnome.{Platform,Sdk}//46` in CI; run `tauri build` to produce `.deb`; run `flatpak-builder --repo=repo build-dir manifest.yml`; `flatpak build-bundle repo app.flatpak <id>`. Existing tauri-action handles the .deb step |
| **Sideload install documentation** | User must know how to copy + install on the Deck | LOW | One README section: USB transfer, `flatpak install --user ~/Downloads/robot-controller.flatpak`, then "Add as Non-Steam Game". No new code |

### Differentiators (Nice-to-have for this milestone)

Features that improve the Steam Deck experience but the robot controller works without them.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-update on launch** | Avoids manual `flatpak update`; pulls newer versions when the user opens the app | MEDIUM-HIGH | **Not free with sideload-only.** `flatpak update` requires a configured remote with a collection ID, and a sideloaded bundle has no remote. Realistic options: (1) document `flatpak update` is a no-op for sideloaded bundles — the user must re-run `flatpak install --user --reinstall` with a newer `.flatpak`; (2) ship a small "check GitHub releases" launcher script that downloads the new bundle and re-runs `flatpak install --user --reinstall`; (3) add a self-hosted repo (currently Out of Scope per PROJECT.md). Recommend **option 2** as a lightweight launcher script — but flag this as the highest-risk item in the milestone since "auto-update" semantics with no repo is fundamentally different from Flathub's model |
| **`com.ks0555.robotcontroller.metainfo.xml` AppStream file** | Allows Discover/GNOME Software to show name, description, screenshots; helps `flatpak update` reasoning | LOW | **Not strictly required for sideload install** — Flatpak docs confirm single-file bundles don't include AppStream and install fine without it. But Tauri's official doc creates one, and flatpak-builder warns without it. Cheap to ship; do it for hygiene |
| **Pre-set window decorations off in Gaming Mode** | Already configured (`decorations: false` in tauri.conf.json) | DONE | No new work; existing config carries over |
| **Filesystem access for logs/config** | If app writes to `~/.config/robot-controller` for last-paired device | LOW | Add `--filesystem=xdg-config/robot-controller:create` only IF the app actually persists state. Currently appears not to (no persistence in `use-bluetooth.ts`). Skip unless added later |
| **Bundle GitHub release attachment** | Single `.flatpak` as a release asset matches the existing tauri-action artifact pattern | LOW | Trivial extension to `.github/workflows/build.yml`; uploads `*.flatpak` instead of `*.AppImage` |

### Anti-Features (Do NOT add — Flathub-specific or out-of-scope)

These are commonly requested or copy-pasted from Flathub manifests but actively wrong for sideload-only.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **`--filesystem=home` or `--filesystem=host`** | "Just give it everything, it works" | Defeats the entire point of Flatpak; SteamOS read-only filesystem makes broad host access mostly useless anyway | Grant only what's needed: BLE D-Bus name + input devices + DRI |
| **Tray icon support (`--talk-name=org.kde.StatusNotifierWatcher`, `--filesystem=xdg-run/tray-icon:create`)** | Tauri's official flatpak doc lists this in its template | Robot controller has no tray icon (single window in `tauri.conf.json`, no `tauri::TrayIconBuilder` in `main.rs`). Adding the permission is dead weight | Omit from finish-args |
| **Flathub submission / metainfo screenshots / OARS rating** | "Make it discoverable" | Out of Scope per PROJECT.md (sideload-only). Flathub adds CI burden, license review, branding requirements | Defer to a future milestone if ever |
| **Self-hosted Flatpak OSTree repo** | Enables `flatpak update` against a remote | Out of Scope per PROJECT.md. Requires hosting an OSTree repo + signing keys + GPG → significant infra | Revisit only if auto-update via re-install proves insufficient |
| **`org.freedesktop.Flatpak` portal (sandbox escape)** | Some guides recommend it for "Flatpak Steam launching Flatpak game" | Steam on Steam Deck is **native, not Flatpak**. This permission only applies if Steam itself is Flatpaked. Adding it is a big sandbox hole for nothing | Omit. Standard Steam ↔ Flatpak game flow on Deck just works |
| **`--socket=session-bus` (full session bus)** | "BLE needs D-Bus" | BlueZ is on the **system bus**, not session bus. Granting full session bus is over-broad and unrelated | Use `--system-talk-name=org.bluez` only |
| **`--socket=pulseaudio` / audio finish-args** | Default in many GUI manifests | Robot controller has no audio | Omit |
| **`--talk-name=org.freedesktop.Notifications`** | Default in many manifests | App does no notifications (no Tauri notification plugin in current code) | Omit |
| **`--share=network` if production build makes no HTTP/WS calls** | Default-on in many manifests | Restricting network is a meaningful security improvement and the BT24 robot is local-only BLE | Audit production CSP — if no network needed, omit `--share=network` |
| **WebKitGTK packaged manually as a module** | "Latest WebKit > runtime WebKit" | The GNOME 46 runtime ships a recent WebKitGTK 4.1 that Tauri v2 supports. Building WebKit in-manifest is a multi-hour build | Use the runtime's WebKitGTK |
| **`org.freedesktop.Platform` instead of `org.gnome.Platform`** | "GNOME runtime is bloated" | Tauri v2 needs GTK + WebKitGTK; freedesktop runtime lacks them | Stick with `org.gnome.Platform//46` |

## Feature Dependencies

```
[Replace bundle.targets in tauri.conf.json: appimage → deb]
    └──enables──> [tauri build produces .deb consumable by flatpak-builder]
                       └──enables──> [Flatpak manifest: extract .deb into /app/bin]
                                          └──enables──> [flatpak-builder produces ostree branch]
                                                             └──enables──> [flatpak build-bundle → single .flatpak file]
                                                                                 └──enables──> [Sideload install on Steam Deck]
                                                                                                     └──enables──> [Add as Non-Steam Game in Desktop Mode]
                                                                                                                         └──enables──> [Launch from Gaming Mode with controller passthrough]

[GNOME 46 runtime] ──required-by──> [WebKitGTK rendering, GTK window chrome]

[finish-args: --system-talk-name=org.bluez + --allow=bluetooth] ──required-by──> [btleplug → BlueZ → BT24 robot]

[finish-args: --device=all (or --device=input)] ──required-by──> [gilrs reading /dev/input/event* for Steam Deck controller]

[finish-args: --socket=wayland + --socket=fallback-x11 + --device=dri + --share=ipc] ──required-by──> [WebKitGTK window]

[.desktop file at /app/share/applications/com.ks0555.robotcontroller.desktop] ──required-by──> [Steam "Add as Non-Steam Game" picker]

[CI workflow change] ──required-by──> [Releases ship .flatpak instead of .AppImage]
[CI workflow change] ──conflicts──> [Existing AppImage tauri-action invocation — must remove]

[AppStream metainfo] ──enhances──> [Discover/GNOME Software display, future Flathub path]
[AppStream metainfo] ──NOT-required-by──> [Sideload install (single-file bundles work without AppStream)]

[Auto-update via re-install script] ──conflicts──> [Pure flatpak update CLI flow] (no remote exists for sideloaded bundle)
```

### Dependency Notes

- **bundle target switch is the entry point**: changing `tauri.conf.json` from `appimage` to `deb` is a one-line config change that the entire flatpak pipeline depends on. Do this in the first execution phase.
- **finish-args are independent of build pipeline**: the manifest's `finish-args` block can be authored and verified by hand before CI integration.
- **AppStream is enhancement, not dependency**: per Flatpak docs, single-file bundles install without AppStream. Build it once for cleanliness, but it's not blocking.
- **Auto-update is downstream of bundle output**: cannot be designed until the `.flatpak` file format and version naming are settled. It is the riskiest feature in this milestone because sideload + auto-update is fundamentally a contradiction without a hosted repo.
- **Steam "Add as Non-Steam Game" depends on `.desktop` file presence**: Flatpak exports the desktop file to `~/.local/share/flatpak/exports/share/applications/`, which Steam's picker reads. No additional integration code needed.

## MVP Definition

### Launch With (this milestone, v2.1)

Minimum to declare v2.1 done: a Steam Deck user can sideload the `.flatpak`, add it as a non-Steam game, launch from Gaming Mode, pair a BT24 robot, and drive it with the gamepad.

- [ ] Switch `tauri.conf.json` `bundle.targets` from `["appimage"]` to `["deb"]`
- [ ] Author `com.ks0555.robotcontroller.yml` Flatpak manifest with GNOME 46 runtime
- [ ] finish-args: `--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`, `--device=all` (or `--device=input` if Flatpak ≥1.15.6 confirmed on Deck), `--system-talk-name=org.bluez`, `--allow=bluetooth`
- [ ] `.desktop` file installed at `/app/share/applications/com.ks0555.robotcontroller.desktop` with `Icon=com.ks0555.robotcontroller`
- [ ] Hicolor icons at 32, 128, 256@2 sizes from existing `icons/icon.png`
- [ ] CI workflow `.github/workflows/build.yml`: install flatpak + flatpak-builder + GNOME 46 runtime; run tauri-action to get `.deb`; run flatpak-builder; run `flatpak build-bundle` to produce `.flatpak`; upload as release asset
- [ ] Remove AppImage build steps from CI
- [ ] README section: how to sideload on Steam Deck (`flatpak install --user`) + "Add as Non-Steam Game" steps
- [ ] Smoke test on Steam Deck hardware: install, launch from Gaming Mode, BLE connection works, gamepad input works

### Add After Validation (v2.1.x)

- [ ] AppStream metainfo file (cosmetic; helps Discover/Software list it nicely)
- [ ] Auto-update launcher: small Rust/shell script that checks GitHub releases on launch, downloads new `.flatpak`, runs `flatpak install --user --reinstall`. Triggered if v2.1 baseline ships and users complain about manual updates
- [ ] Tighten `--device=all` → `--device=input` if Flatpak version on shipping SteamOS is confirmed ≥1.15.6
- [ ] Drop `--share=network` from finish-args if production CSP audit confirms no HTTP/WS in prod build

### Future Consideration (v2.2+)

- [ ] Self-hosted Flatpak repo (proper `flatpak update` semantics) — only if sideload + re-install proves too painful
- [ ] Flathub submission — would require AppStream screenshots, OARS rating, license review, build hygiene; large undertaking
- [ ] Snap or AUR packaging — only if non-Steam-Deck Linux users emerge

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Switch bundle target appimage → deb | HIGH (unblocks everything) | LOW | P1 |
| Flatpak manifest with BLE + gamepad finish-args | HIGH (app does nothing without these) | LOW | P1 |
| GNOME 46 runtime + WebKit/GTK socket args | HIGH (app does not render without these) | LOW | P1 |
| `.desktop` file + hicolor icons | HIGH (Steam picker needs them) | LOW | P1 |
| CI bundle + release upload | HIGH (distribution path) | MEDIUM | P1 |
| Sideload + Add-as-Non-Steam docs | MEDIUM (one-time onboarding) | LOW | P1 |
| Smoke test on real Deck | HIGH (validation gate) | LOW (manual) | P1 |
| AppStream metainfo | LOW (cosmetic for sideload) | LOW | P2 |
| Auto-update launcher | MEDIUM (UX polish) | MEDIUM-HIGH (download + reinstall plumbing) | P2 |
| `--device=input` migration | LOW (security hygiene) | LOW | P3 |
| Network finish-arg audit | LOW (security hygiene) | LOW | P3 |

**Priority key:**
- P1: Must have for v2.1 launch
- P2: Should have, add post-launch if signal warrants it
- P3: Nice-to-have hygiene, no blocker

## Comparable Tauri-on-Flatpak Implementations Analyzed

| Feature | Tauri official doc (deb-extract pattern) | Vincent Jousse's blog (build-from-source pattern) | Our approach |
|---------|------------------------------------------|---------------------------------------------------|--------------|
| Build mode | Extract `tauri build`'s `.deb` inside flatpak-builder | Build Rust + npm inside flatpak sandbox (offline-mode dance with cargo + npm) | **Tauri official (deb-extract)** — far simpler, leverages existing tauri-action CI |
| Runtime | GNOME 46 | GNOME 46 | GNOME 46 (matches both) |
| BLE finish-arg | Not covered (no BLE in their example) | N/A | `--system-talk-name=org.bluez` + `--allow=bluetooth` (verified pattern) |
| Gamepad finish-arg | Not covered | N/A | `--device=all` for SteamOS compatibility (or `--device=input` on newer Flatpak) |
| Tray icon args | Listed as default | N/A | **Omit** — robot controller has no tray |
| AppStream | Required by their template | Required for Flathub | **Optional** for sideload — ship for hygiene, not as a blocker |

## Sources

- [Tauri v2 official Flatpak distribution doc](https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx) — authoritative pattern for Tauri-on-Flatpak (deb extraction, GNOME 46, finish-args, icon sizes, .desktop file path)
- [Tauri Distribute index](https://v2.tauri.app/distribute/)
- [Flatpak Sandbox Permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html) — finish-args reference, `--system-talk-name`, `--allow=bluetooth`, `--device=*`
- [Flatpak Single-File Bundles](https://docs.flatpak.org/en/latest/single-file-bundles.html) — confirms bundles install without AppStream and don't carry remote/collection-id
- [Flatpak Command Reference](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) — `flatpak install --user`, `flatpak build-bundle`, `flatpak update`
- [Flatpak Requirements & Conventions](https://docs.flatpak.org/en/latest/conventions.html) — desktop file location, icon sizes, AppStream expectations
- [Flatpak issue #1719: Add bluetooth permission](https://github.com/flatpak/flatpak/issues/1719) — confirms `--system-talk-name=org.bluez` is the right grant for BLE
- [Flatpak issue #7: Add joystick access to the sandbox](https://github.com/flatpak/flatpak/issues/7) — history and resolution of evdev access
- [Flathub Discourse: Support for device=input](https://discourse.flathub.org/t/support-for-device-input/6645) — `--device=input` introduced in Flatpak 1.15.6
- [Flatpak 1.16 release notes](https://9to5linux.com/flatpak-1-16-linux-app-sandboxing-and-distribution-framework-officially-released) — `--device=input` GA
- [Vincent Jousse: Packaging Tauri v2 for flatpak](https://vincent.jousse.org/blog/en/packaging-tauri-v2-flatpak-snapcraft-elm/) — alternative build-from-source approach (rejected for our use case)
- [Tauri discussion #4426: Approach to creating Flatpak bundles](https://github.com/tauri-apps/tauri/discussions/4426) — community design discussion, confirms deb-extract pattern
- [Steam community: Flatpak controller passthrough on Deck](https://steamcommunity.com/app/1675200/discussions/0/3273565933119215257/) — confirms native Steam on Deck handles Flatpak non-Steam games' controller passthrough correctly
- [Flatpak Using-Flatpak (auto-update)](https://docs.flatpak.org/en/latest/using-flatpak.html) — confirms no built-in auto-update; relies on remote + collection ID

---
*Feature research for: Flatpak packaging of Tauri v2 robot controller on Steam Deck (sideload-only)*
*Researched: 2026-05-09*
