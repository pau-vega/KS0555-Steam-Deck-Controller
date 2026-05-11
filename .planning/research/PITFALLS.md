# Pitfalls Research

**Domain:** Flatpak packaging of an existing Tauri v2 + btleplug + gilrs app on Steam Deck
**Researched:** 2026-05-09
**Confidence:** HIGH for Flatpak sandbox semantics (official docs), HIGH for Tauri Flatpak workflow (official Tauri v2 distribute doc, still flagged `draft: true`), MEDIUM for Steam Deck-specific runtime quirks (community sources, recent SteamOS changes), MEDIUM for `--device=input` availability on Steam Deck (depends on installed flatpak version).

This document focuses **only on the v2.1 Flatpak packaging milestone**. The v2.0 BLE/gamepad/Tauri pitfalls (Send/Sync, async runtime, etc.) are out of scope here — they were captured during the v2.0 milestone and the relevant code already shipped in `apps/frontend/src-tauri/src/{ble,gamepad}/mod.rs`.

The codebase context that drives these pitfalls:

- `tauri.conf.json` currently declares `"targets": ["appimage"]` and identifier `com.ks0555.robotcontroller`.
- `src/main.rs` sets `WEBKIT_DISABLE_COMPOSITING_MODE=1` before WebKitGTK init.
- `src/lib.rs` rewrites `DBUS_SYSTEM_BUS_ADDRESS` to `/run/host/run/dbus/system_bus_socket` when running on SteamOS — **this assumes Flatpak's host-bus mount layout, which only exists when `--filesystem=host-os` or specific filesystem grants are present, OR when `--socket=system-bus` is used**. This piece of code is the single biggest integration risk for Flatpak.
- `.github/workflows/build.yml` builds AppImage with a custom `tauri-cli` fork (`feat/truly-portable-appimage`) on `ubuntu-24.04`. There is no `flatpak`, `flatpak-builder`, or Flatpak runtime cache step.

---

## Critical Pitfalls

### Pitfall 1: Assuming Tauri has a built-in `flatpak` bundle target

**What goes wrong:**
The PROJECT.md's "Active" requirement says "Flatpak bundle build target replaces AppImage in CI". Reading that as "set `bundle.targets: ["flatpak"]` in `tauri.conf.json`" leads to a dead end — Tauri's CLI bundler does **not** emit Flatpak bundles directly. The valid Tauri v2 Linux bundle targets are `deb`, `rpm`, `appimage`. There is no `flatpak` target.

**Why it happens:**
Tauri v2 documentation lists Flatpak under "Distribute", which makes it look symmetrical with AppImage. It is not — the official guide (`distribute/flatpak.mdx`, currently still `draft: true` upstream) is a recipe for **building a `.deb` with Tauri, then writing a separate `flatpak-builder.yaml` that extracts that `.deb` into `/app/`**. Flatpak issue #3619 ("[feat] Bundle Tauri apps as Flatpak") is still open as a proposal, and Discussion #4426 confirms the recommended approach is "use the .deb as a base."

**Consequences:**
- Wasted phase work trying to make `cargo tauri build --bundles flatpak` succeed.
- Misleading roadmap phase "Add Flatpak target to Tauri config" — that phase does not exist as a single config change.
- AppImage cannot be cleanly "replaced" with one CLI flag swap; it requires a parallel pipeline (deb → flatpak-builder → .flatpak).

**How to avoid:**
- Plan two coupled artifacts: switch `tauri.conf.json` `bundle.targets` from `["appimage"]` to `["deb"]` (deb is the **input** to flatpak-builder), then add a `packaging/flatpak/com.ks0555.robotcontroller.yaml` manifest that consumes the `.deb`.
- Drop the custom `feat/truly-portable-appimage` `tauri-cli` fork — it's only relevant for AppImage and the deb target works with stock `tauri-cli`.
- Do not put `"flatpak"` in `bundle.targets`; Tauri will reject it.

**Warning signs:**
- `cargo tauri build` fails with `unknown bundle target 'flatpak'`.
- Roadmap phase named "Add flatpak to bundle.targets" — that's a clue the wrong mental model is in play.

**Phase to address:**
**Phase 1 — Bundle pipeline restructure.** First milestone phase must (a) flip `bundle.targets` to `["deb"]`, (b) confirm `tauri-action`/CI produces a `.deb`, (c) introduce `packaging/flatpak/<id>.yaml` skeleton. No actual Flatpak build happens yet — just establish the input artifact.

**Sources:**
- Tauri v2 Flatpak distribute doc (raw, `draft: true`): https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx
- Issue #3619 (still open): https://github.com/tauri-apps/tauri/issues/3619
- Discussion #4426 (recommended approach): https://github.com/tauri-apps/tauri/discussions/4426

---

### Pitfall 2: Missing `--system-talk-name=org.bluez` — BLE silently fails to scan

**What goes wrong:**
btleplug talks to BlueZ over the **system** D-Bus (not the session bus). Without `--system-talk-name=org.bluez` in `finish-args`, every call into `Adapter::start_scan`, `Peripheral::connect`, etc. fails — but **not loudly**. btleplug's BlueZ backend surfaces these as generic timeouts or "no adapter" errors, not as "permission denied". The user sees a "scan started but no devices ever appear" UI state.

**Why it happens:**
Flatpak's default sandbox blocks **all** system-bus services except the few in the portal allowlist. `--talk-name` only opens the **session** bus (which BlueZ does not use). The two are different policies; mixing them up is the single most common BLE-Flatpak bug.

A second, related failure: even with the talk-name, the existing `lib.rs` code computes `DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/host/run/dbus/system_bus_socket` from a `/run/host/...` probe. Inside the Flatpak sandbox, `/run/host/run/dbus/system_bus_socket` only exists if the manifest exposes it — by default Flatpak proxies the system bus to a different path. With `--system-talk-name=org.bluez`, the proxied bus address is automatically set in `DBUS_SYSTEM_BUS_ADDRESS` by the Flatpak runtime; the manual override in `lib.rs` will overwrite it with a non-existent path and break BLE.

**Consequences:**
- BLE-01/02/03 commands return Ok but no advertisements ever arrive → UI stuck on "Scanning…".
- Or worse: the `lib.rs` env-var override silently points btleplug at a missing socket → connection never establishes, no useful error.

**How to avoid:**
1. Add `--system-talk-name=org.bluez` and `--system-talk-name=org.bluez.*` to `finish-args`. The Flatpak portal will proxy system-bus traffic for these names only.
2. Audit `apps/frontend/src-tauri/src/lib.rs` lines 11–20: gate the `DBUS_SYSTEM_BUS_ADDRESS` rewrite on **not running under Flatpak**. Detect Flatpak via `std::env::var("FLATPAK_ID").is_ok()` or the `/.flatpak-info` file. Inside Flatpak, leave `DBUS_SYSTEM_BUS_ADDRESS` alone — the runtime sets it correctly.
3. Add `--env=FLATPAK=1` (or rely on `/.flatpak-info`) so Rust can branch cleanly.
4. Smoke-test from a `flatpak run --command=sh com.ks0555.robotcontroller` shell: `busctl --system list | grep bluez`. If the org.bluez name is invisible, the talk-name is missing.

**Warning signs:**
- `Scan started` log message but `gamepad-direction` events never trigger BLE writes (downstream effect: robot doesn't move).
- `RUST_LOG=btleplug=debug flatpak run …` shows `dbus error: NameHasNoOwner` or `Connection refused`.
- `flatpak run --command=ls com.ks0555.robotcontroller /run/host/run/dbus/` fails with `No such file or directory` — confirms the host-mount assumption from `lib.rs` does not hold inside Flatpak.

**Phase to address:**
**Phase 2 — Sandbox permissions for BLE.** This is the most failure-prone phase. Pair it with a dedicated Steam Deck smoke test (BT24 reachable, `ble-state-changed=connected` event observed) before declaring done.

**Sources:**
- Flatpak Sandbox Permissions doc: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak issue #1719 ("Add bluetooth permission") — confirms `--system-talk-name=org.bluez` is the canonical pattern: https://github.com/flatpak/flatpak/issues/1719
- btleplug README on BlueZ filtering: https://github.com/deviceplug/btleplug

---

### Pitfall 3: Confusing `--device=bluetooth` (AF_BLUETOOTH socket) with BlueZ D-Bus access

**What goes wrong:**
Adding `--device=bluetooth` (or the older `--allow=bluetooth`) and assuming that's enough. It is not. `--device=bluetooth` adjusts seccomp to allow `AF_BLUETOOTH` raw sockets, used by apps that talk to the kernel BT stack directly (e.g. `bluetoothctl` over rfkill, or apps using `socket(AF_BLUETOOTH)`). btleplug on Linux **does not** use AF_BLUETOOTH directly; it talks to BlueZ via D-Bus. So `--device=bluetooth` alone gives you nothing for btleplug, while making the sandbox more permissive than necessary.

**Why it happens:**
Stack Overflow / blog posts mix the two when they say "give the app Bluetooth access." For raw BT sockets you need `--device=bluetooth`; for BlueZ D-Bus you need `--system-talk-name=org.bluez`. They serve different stacks.

**Consequences:**
- False sense of permission completeness. App still cannot scan.
- Larger attack surface than necessary in the sandbox.

**How to avoid:**
- For btleplug specifically: `--system-talk-name=org.bluez` is sufficient; **do not** add `--device=bluetooth` unless a future feature uses raw BT sockets.
- Document this in the manifest as a comment so future contributors don't "helpfully" add the redundant flag.

**Warning signs:**
- finish-args contain both `--device=bluetooth` and `--system-talk-name=org.bluez` with no comment explaining why both — likely cargo-culted.

**Phase to address:**
**Phase 2 — Sandbox permissions for BLE.** Decide and document the minimum permission set during this phase.

**Sources:**
- Flatpak Sandbox Permissions doc (device options table): https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Working with the Sandbox: https://flatpak-testing.readthedocs.io/en/latest/working-with-the-sandbox.html

---

### Pitfall 4: `gilrs` cannot see `/dev/input/event*` without `--device=input` (or `--device=all`)

**What goes wrong:**
gilrs is a pure-userspace evdev reader on Linux. Without filesystem access to `/dev/input/event*`, `Gilrs::new()` succeeds but reports zero gamepads forever. The `gamepad-connected` event is never emitted, the Steam Deck's built-in controller is invisible to the Rust backend, and the user can connect to the BT24 robot but no buttons work.

**Why it happens:**
Flatpak isolates `/dev` by default. The fine-grained `--device=input` option that exposes only `/dev/input/event*` was introduced in **Flatpak 1.15.6** (stable in 1.16). Older Flatpak versions only have the coarse `--device=all`. SteamOS Steam Deck Stable currently ships Flatpak 1.14.x or 1.15.x depending on channel — `--device=input` may or may not be honored on a given Deck.

**Consequences:**
- gilrs sees zero gamepads → the gamepad event loop is silent → `use-gamepad.ts` never receives `gamepad-direction` events → robot doesn't respond to controls.
- If `--device=input` is rejected by an older Flatpak version on the Deck, the install/run errors out at sandbox creation time with a confusing message.

**How to avoid:**
1. Use `--device=input` as the **first** choice in the manifest (correct, minimum-permission).
2. Verify the target Steam Deck's flatpak version: `flatpak --version` on a Deck on the user's channel. If < 1.15.6, fall back to `--device=all` and add a comment with the upgrade path.
3. Add a runtime check in Rust: at gilrs startup, log the count of detected devices. If zero, log `WARN gilrs detected 0 devices — check Flatpak finish-args (--device=input or --device=all)`.
4. Do not assume udev rules ship with the Flatpak — Flatpak apps cannot install udev rules on the host. The Steam Deck already has the right udev rules for its built-in controller, but external controllers depend on the host system's `steam-devices` package.

**Warning signs:**
- `journalctl --user -t com.ks0555.robotcontroller | grep gilrs` shows "0 gamepads" at startup.
- `flatpak run --command=ls com.ks0555.robotcontroller /dev/input` returns nothing or is permission-denied.

**Phase to address:**
**Phase 3 — Sandbox permissions for gamepad.** Run on a real Steam Deck (the only fully reliable test surface) before locking in the device option.

**Sources:**
- Flatpak Sandbox Permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak xdg-desktop-portal Issue #536 (input device portal): https://github.com/flatpak/xdg-desktop-portal/issues/536
- "Steam Deck, HID, and libmanette" (Alice Mikhaylenko): https://blogs.gnome.org/alicem/2024/10/24/steam-deck-hid-and-libmanette-adventures/

---

### Pitfall 5: `WEBKIT_DISABLE_COMPOSITING_MODE` is set in Rust but not propagated to the Flatpak environment

**What goes wrong:**
`main.rs` and `lib.rs` both set `WEBKIT_DISABLE_COMPOSITING_MODE=1` via `std::env::set_var` before WebKitGTK init. This works for AppImage (single process, env-var rewrite happens before any GTK init). But under Flatpak, **the WebKitGTK runtime in `org.gnome.Platform//46` is loaded via dynamic linker BEFORE Rust user code runs in some configurations** — in particular when Flatpak/wpe loads its own bwrap helper. If WebKit reads the env var during library load (before `main()`), the Rust-side `set_var` is too late.

Empirically, `WEBKIT_DISABLE_COMPOSITING_MODE` is read at WebKitProcess startup, which is forked from the main process. The set_var **does** generally get inherited by the child, but Wayland-only sessions on Gamescope/SteamOS have shown cases where the renderer crashes with a black/white screen if compositing isn't disabled at the **manifest** level.

**Why it happens:**
Tauri's official Flatpak doc explicitly comments out `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` in the sample manifest with the note "Optional: may solve some issues with black webviews on Wayland." That comment exists because Wayland + WebKitGTK + Flatpak has had recurring rendering bugs.

**Consequences:**
- Blank white or black window in Steam Deck Gaming Mode (Gamescope) — the same regression v2.0 already fixed for AppImage, returning under Flatpak.
- Inconsistent dev experience: works on Desktop Mode (X11/KDE), fails on Gaming Mode.

**How to avoid:**
1. **Belt-and-suspenders:** keep the Rust `set_var` in `main.rs`/`lib.rs` AND add `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` to `finish-args`. Both work together.
2. Also consider `--env=WEBKIT_DISABLE_DMABUF_RENDERER=1` — newer WebKitGTK versions in GNOME 48+ runtimes default to a DMABUF renderer that has separate problems on llvmpipe/software rendering.
3. Always include `--device=dri` so the GNOME 46 runtime can use the GPU; without it, WebKit falls back to llvmpipe and rendering bugs multiply.
4. Test in Gaming Mode (not just Desktop Mode) before declaring the bundle "works on Steam Deck."

**Warning signs:**
- White/blank window on Deck Gaming Mode despite working in Desktop Mode.
- `WEBKIT_DEBUG=` logs show `accelerated compositing failed` or `epoxy_eglInitialize`.

**Phase to address:**
**Phase 4 — Manifest renderer/runtime tuning.** Should explicitly include "verified rendering on Gaming Mode" as a success criterion, not just Desktop Mode.

**Sources:**
- Tauri Flatpak distribute doc (sample manifest with the env-var comment): https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx
- Carlos Garcia Campos on WebKitGTK accelerated compositing: https://blogs.igalia.com/carlosgc/2023/04/03/webkitgtk-accelerated-compositing-rendering/
- WebKit bug 165246 (Wayland compositing): https://bugs.webkit.org/show_bug.cgi?id=165246

---

### Pitfall 6: Installing system-wide on Steam Deck — wiped or broken by SteamOS updates

**What goes wrong:**
Documenting `flatpak install bundle.flatpak` (no flag) on Steam Deck. The default depends on system policy; on a Deck with `flatpak --user remote-add` already configured for Discover, the user *might* hit `--user`, but a `sudo flatpak install` lands in `--system`, which writes to `/var/lib/flatpak`. That path is on the immutable rootfs overlay — SteamOS atomic updates **can** wipe pacman packages and have caused Flatpaks installed without `--user` to disappear or fail to update post-update.

**Why it happens:**
SteamOS uses an A/B atomic-update model. Anything outside `/home` is potentially overwritten on update. `--user` Flatpaks live in `~/.local/share/flatpak` and `~/.var/app/<id>/` (both under `/home`, persistent across SteamOS updates). `--system` Flatpaks live under `/var`, which **is** preserved across SteamOS updates today, but ValveSoftware/SteamOS issue history shows this is fragile and Discover defaults to `--user` for a reason.

**Consequences:**
- After a SteamOS update, the app vanishes from the Library / "Add Non-Steam Game" picker.
- Or: the app is present but `flatpak update` fails with "remote not found" because the sideloaded bundle has no associated remote.
- User support load: "I updated my Deck and the robot controller is gone."

**How to avoid:**
1. Ship a one-line install instruction: `flatpak install --user RobotController.flatpak`.
2. Document the `flatpak run com.ks0555.robotcontroller` command and add-to-Steam workflow with `--user` paths.
3. Reject any contributor PR that documents `sudo flatpak install` without `--user` — this is a footgun, not a feature.
4. App user-data lives at `~/.var/app/com.ks0555.robotcontroller/` regardless of scope; tell users this is where to back up if any.

**Warning signs:**
- README says `sudo flatpak install …` or `flatpak install --system …`.
- Test deck after a SteamOS update shows the app missing.

**Phase to address:**
**Phase 5 — Steam Deck install/run docs.** Bake `--user` into every documented command.

**Sources:**
- Flatpak Commands Cheat Sheet for Steam Deck: https://pulsegeek.com/articles/flatpak-commands-cheat-sheet-for-steam-deck/
- Steam community discussion (SteamOS updates wiping packages): https://steamcommunity.com/app/1675200/discussions/0/3181237058689666854/
- ValveSoftware/SteamOS Issue #830 (flatpak quirks): https://github.com/ValveSoftware/SteamOS/issues/830

---

### Pitfall 7: Sideloaded `.flatpak` bundles do NOT auto-update

**What goes wrong:**
A `.flatpak` single-file bundle produced by `flatpak build-bundle` is a self-contained snapshot. After `flatpak install --user RobotController.flatpak`, `flatpak update` does **nothing** for this app — there is no remote OSTree repo to pull deltas from. Users assume `flatpak update` will pull v0.2.0 over v0.1.5; it won't.

**Why it happens:**
Single-file bundles are designed for offline transport (USB, email). Flatpak docs are explicit: "Hosting a repository is the preferred way to distribute an application, since repositories allow applications to be updated." A `.flatpak` is not a repo.

The PROJECT.md "Active" requirement says "Auto-update workflow (`flatpak update`) documented or scripted" — this is misleading as written. There are two real options:

a. Re-install the new `.flatpak` over the old one (`flatpak install --user --reinstall NewBundle.flatpak`). Not auto, manual.
b. Publish to a self-hosted OSTree repo or static OCI registry and have users `flatpak remote-add` once. Then `flatpak update` works. But "Self-hosted Flatpak repo" is in PROJECT.md "Out of Scope".

**Consequences:**
- README claims auto-update; users never get fixes.
- Or: roadmap promises `flatpak update` works, then can't deliver because the out-of-scope decision blocks it.

**How to avoid:**
- Document honestly: "Sideload bundles do not auto-update. To upgrade, download the new `.flatpak` from GitHub Releases and re-install."
- Optionally ship a `update.sh` wrapper: `curl -L https://github.com/.../latest/RobotController.flatpak -o /tmp/rc.flatpak && flatpak install --user --reinstall /tmp/rc.flatpak`. Document this as the upgrade path.
- If true `flatpak update` is needed, escalate to a milestone scope review and reconsider the "Out of Scope: Self-hosted Flatpak repo" decision.

**Warning signs:**
- README phrase "auto-updates via `flatpak update`" without a remote configured.
- User issue: "I tried `flatpak update` and got `nothing to do`."

**Phase to address:**
**Phase 6 — Update workflow docs.** Resolve the contradiction in PROJECT.md before writing user-facing docs. Recommend the milestone explicitly amend the "Auto-update workflow" requirement to "Manual upgrade workflow (`flatpak install --reinstall`) documented".

**Sources:**
- Flatpak single-file-bundles doc: https://docs.flatpak.org/en/latest/single-file-bundles.html
- flatpak-install(1) man page: https://man7.org/linux/man-pages/man1/flatpak-install.1.html
- flatpak-update(1) man page: https://man7.org/linux/man-pages/man1/flatpak-update.1.html

---

### Pitfall 8: "Add Non-Steam Game" picker doesn't list Flatpaks; wrong launch command in Gaming Mode

**What goes wrong:**
On Steam Deck, "Add a Non-Steam Game…" in Steam scans `/usr/share/applications` and `~/.local/share/applications` for `.desktop` files. Flatpak apps install their `.desktop` to `~/.local/share/flatpak/exports/share/applications/` (for `--user`) which Steam **does not always scan**. Even when Steam picks it up, the launch command in the resulting Steam shortcut is `/usr/bin/flatpak run --branch=stable --arch=x86_64 com.ks0555.robotcontroller`. In Gaming Mode this can fail because:

1. Steam's Gaming Mode launches from a different env (no `XDG_DATA_DIRS` pointing at the user flatpak exports).
2. The `Exec=` line in the generated `.desktop` may use placeholders (`@@u %U @@`) that Steam strips incorrectly.
3. If the app uses `decorations: false` (which `tauri.conf.json` already does), Gamescope may render it as a non-interactive background unless the window is properly fullscreened.

**Why it happens:**
Gaming Mode is Gamescope-on-top-of-SteamOS, not the desktop session. It expects games launched via Steam runtime, not via Flatpak's `bwrap`. Flatpak inside Gamescope works but has been historically buggy (Heroic Games Launcher #4708 documents Flatpak runtime 24.08 input regression in Gaming Mode).

**Consequences:**
- App shortcut runs in Desktop Mode but black-screens or fails in Gaming Mode.
- Steam Input remapping doesn't apply (Steam doesn't recognize the Flatpak as a "controller-aware" target).

**How to avoid:**
1. Document the manual approach: in Desktop Mode → Steam → "Add a Non-Steam Game" → "Browse" → navigate to `~/.local/share/flatpak/exports/share/applications/com.ks0555.robotcontroller.desktop` → add. Then verify the launch command is exactly `/usr/bin/flatpak run com.ks0555.robotcontroller` (strip any extra arguments Steam injects).
2. Set Launch Options in Steam properties to `STEAM_COMPAT_LAUNCHER_SERVICE=steam.deck %command%` only if needed.
3. Ship a `.desktop` file with `Categories=Utility;Network;` (not `Game`) so it's clear this is not a Proton/Wine target.
4. **Test on a real Deck in Gaming Mode** as a phase exit criterion. Desktop-Mode-only verification is not sufficient.
5. Set `decorations: true` for the Flatpak build configuration if Gaming Mode windows misbehave (or document a Gamescope full-screen flag).

**Warning signs:**
- Shortcut appears in Steam library but clicking "Play" returns to library immediately.
- Black screen in Gaming Mode while Desktop Mode works.

**Phase to address:**
**Phase 7 — Gaming Mode integration.** Must include real-Deck-in-Gaming-Mode test as exit criterion.

**Sources:**
- BoilR Discussion #425 on Flatpak non-Steam game launchers: https://github.com/PhilipK/BoilR/discussions/425
- Heroic Issue #4708 (Steam Input + Flatpak runtime 24.08): https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/4708
- Steam Deck bug discussion: https://steamcommunity.com/app/1675200/discussions/1/3824162683805228541/

---

### Pitfall 9: `flatpak-builder` build sandbox has no network — cargo and pnpm fetches fail

**What goes wrong:**
`flatpak-builder` runs each module's `build-commands` inside a network-isolated sandbox by default. If your `build-commands` invokes `cargo build` or `pnpm install`, both fail with network errors. This is intentional — Flatpak (especially Flathub submission) requires reproducible offline builds. Even though this milestone is "sideload only" (Flathub out of scope), CI on `ubuntu-24.04` will hit the same wall the moment `flatpak-builder` is invoked.

**Why it happens:**
The Tauri official guide sidesteps this by having flatpak-builder consume a **pre-built `.deb`** as a `type: file` source (deb is downloaded by flatpak-builder before the sandbox starts, then the build step just `ar -x`'s it — no network needed inside the sandbox). This is the right pattern; trying to do `cargo build` inside the flatpak-builder module is the wrong pattern.

The `.deb` itself is built **outside** flatpak-builder (in the regular CI job) where network access is fine. flatpak-builder consumes the artifact.

**Consequences:**
- Reinventing flatpak-cargo-generator / flatpak-node-generator infrastructure unnecessarily.
- CI jobs running 30+ minutes generating offline manifests for cargo/pnpm when none of that is required for the deb-extraction path.
- Adding `--allow-network=host` or `build-options.build-args: [--share=network]` to bypass the restriction — this works locally but Flathub rejects it. For a sideload-only release this is technically permissible but is a smell that the deb-extract path was missed.

**How to avoid:**
- Stick to the deb-extract approach. CI: build `.deb` first (network on), then `flatpak-builder` consumes the `.deb` as a `type: file` source (no network in sandbox required).
- Do **not** add `flatpak-cargo-generator` or `flatpak-node-generator` for this milestone — they're for source-rebuild manifests targeted at Flathub. Out of scope per PROJECT.md.
- If a future Flathub submission is reconsidered, that's a separate milestone with its own offline-manifest scope.

**Warning signs:**
- CI step running `pnpm install` inside `build-commands:` of the manifest.
- Manifest contains `build-options: { build-args: [--share=network] }` — works locally, would fail Flathub review.

**Phase to address:**
**Phase 1 — Bundle pipeline restructure** establishes the deb-as-input pattern early so this never comes up.

**Sources:**
- Tauri Flatpak guide showing `type: file` deb consumption: https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx
- flatpak-builder docs: https://docs.flatpak.org/en/latest/flatpak-builder.html
- flatpak-builder-tools cargo README: https://github.com/flatpak/flatpak-builder-tools/blob/master/cargo/README.md

---

### Pitfall 10: GitHub Actions `ubuntu-24.04` ships an outdated `flatpak-builder`

**What goes wrong:**
`ubuntu-24.04` runners ship `flatpak` ~1.14 / `flatpak-builder` ~1.4 from the apt repo. These versions:
- Do not support `--device=input` (need 1.15.6+) — though only relevant if the runner runs the resulting Flatpak; for **building** it doesn't matter.
- Have known bugs with rootless `flatpak-builder` on cgroup v2 hosts (runner-images issue #11359). Builds fail with cryptic `bwrap: setting up uid map: Permission denied` or `file-read-error`.

**Why it happens:**
Ubuntu LTS apt repos lag the Flatpak project's release cadence. The fix is to use the official `flatpak/flatpak-github-actions/flatpak-builder` action which runs inside a `ghcr.io/flathub-infra/flatpak-github-actions:gnome-46` (or `gnome-48`) container with current tooling and the runtime pre-installed.

**Consequences:**
- Build fails on CI but works locally on a developer's recent Arch/Fedora.
- Time wasted debugging "works on my machine".
- Or: build succeeds with old flatpak-builder but produces a bundle that fails on newer Decks (or vice versa).

**How to avoid:**
1. Use `flatpak/flatpak-github-actions/flatpak-builder@v6` action, not `apt install flatpak-builder`. The action handles the container with the right tooling.
2. Pin the runtime image: `bundle: rc.flatpak`, `manifest-path: packaging/flatpak/<id>.yaml`, with `flatpak-version: 'gnome-46'` (matches the manifest's `runtime-version: '46'`).
3. Cache OSTree: enable `cache: true` in the action — the GNOME 46 runtime is ~1GB and unconditionally re-downloading it adds ~5min to every CI run.
4. CI must build for x86_64 only for v2.1 — Steam Deck is x86_64. Drop the arm64 leg in the new Flatpak workflow (the AppImage workflow currently has it; it's wasted work for this milestone).

**Warning signs:**
- CI YAML has `apt install flatpak-builder` followed by manual `flatpak install` of the runtime (slow, fragile).
- Build step runs as root in the runner (cgroup v2 issues).

**Phase to address:**
**Phase 8 — CI migration to Flatpak.** Replace the existing `build-x64` AppImage job with a Flatpak job using the official action. Drop `build-arm64` (Steam Deck is x86_64; arm64 is not in scope).

**Sources:**
- flatpak/flatpak-github-actions: https://github.com/flatpak/flatpak-github-actions
- runner-images Issue #11359 (flatpak-builder error on ubuntu-24.04): https://github.com/actions/runner-images/issues/11359
- Flathub Discourse on CI: https://discourse.flathub.org/t/implementing-flathub-cicd-with-github-actions/4902

---

### Pitfall 11: Removing AppImage from `build.yml` before Flatpak is verified on a real Deck

**What goes wrong:**
PROJECT.md says "Flatpak bundle build target replaces AppImage in CI." Implemented literally — delete the AppImage job, ship Flatpak — leaves a window where the only available artifact is unproven on hardware. If the Flatpak fails on the Deck, there's no fallback for users on existing v0.1.5 AppImages who still want to install fresh.

**Why it happens:**
"Replace" is read as "delete the old, add the new in one PR". For a distribution change (the artifact users actually consume), parallel-run is safer than swap-in-place.

**Consequences:**
- A bad Flatpak release leaves users with no working install path.
- Rollback requires reverting CI workflow + recreating tags, more work than parallel.

**How to avoid:**
1. Keep both `build-x64` (AppImage) and a new `build-flatpak-x64` job during a transition window: at least one tagged release with both artifacts, verified working on Deck.
2. Delete the AppImage job in a separate PR after Flatpak is verified.
3. Drop the macOS build only when explicitly decided — it's currently in `build.yml` and PROJECT.md says "Linux/SteamOS only" but doesn't say to remove macOS. Keep macOS unless asked.

**Warning signs:**
- A single PR titled "switch to Flatpak" deletes both AppImage jobs and adds Flatpak in one step, with no Deck verification commit.

**Phase to address:**
**Phase 8 — CI migration.** Make "AppImage removed" a separate phase from "Flatpak added", with at least one release in between that ships both.

---

### Pitfall 12: CSP and Vite `frontendDist` paths break under `/app/lib/<id>/` resource layout

**What goes wrong:**
Tauri's resource resolver defaults to `/usr/lib/<crate_name>/` on Linux. Inside a Flatpak, the `.deb` is extracted into `/app/lib/<product_name>/`, not `/usr/lib/`. If anything in the app loads resources by absolute path, those paths break. Additionally, the CSP in `tauri.conf.json` allows `connect-src 'self' http://localhost:5173 ws://localhost:5173` — those `localhost` entries are dev-only; in production WebKit will block any websocket the frontend tries to open, which is fine for this app (it doesn't talk to localhost in prod) but is a code smell.

For frontends loaded via `tauri://localhost/` (Tauri's custom protocol), CSP `default-src 'self'` covers it. Under Flatpak the protocol is the same — Tauri's WebKit doesn't load via `file://`. So no special CSP work is needed.

**Why it happens:**
The resource-resolver `/usr` vs `/app` mismatch is documented in the vincent.jousse blog post as a real gotcha for projects that bundle non-binary resources. The current app does not use `tauri::path::resource_dir()` (a `grep` of `apps/frontend/src-tauri/src/` confirms BLE/gamepad code doesn't load extra files), so this milestone is **probably** unaffected. But if a future feature adds, say, a bundled config file, this lurks.

**Consequences:**
- Most likely: nothing for v2.1 specifically.
- Latent risk: any future `app.path().resource_dir()` call returns `/app/lib/RobotController/` instead of `/usr/lib/RobotController/`, and code that hardcodes `/usr/...` breaks.

**How to avoid:**
1. Audit Rust + frontend for any hardcoded `/usr/` or `/opt/` paths. Today there are none — keep it that way.
2. Always use `app.path().resource_dir()` / `app.path().app_data_dir()` (Tauri APIs), never absolute paths.
3. Leave the existing CSP as-is. The `localhost:5173` allowance is only used by `pnpm dev`, not by the bundled app.

**Warning signs:**
- New code introducing `std::fs::read_to_string("/usr/lib/...")` or similar.
- CSP errors in WebKit DevTools console.

**Phase to address:**
**Phase 4 — Manifest renderer/runtime tuning** can include a quick audit step ("grep for hardcoded `/usr/` paths").

**Sources:**
- Vincent Jousse's Tauri+Flatpak blog: https://vincent.jousse.org/blog/en/packaging-tauri-v2-flatpak-snapcraft-elm/
- Tauri CSP doc: https://v2.tauri.app/security/csp/

---

### Pitfall 13: `/run/host/run/dbus/system_bus_socket` rewrite in `lib.rs` is incompatible with Flatpak

**What goes wrong:**
This is critical enough to call out separately from Pitfall 2. `apps/frontend/src-tauri/src/lib.rs` lines 11–20:

```rust
if std::env::var("DBUS_SYSTEM_BUS_ADDRESS").is_err() {
    let steamos_socket = "/run/host/run/dbus/system_bus_socket";
    if std::path::Path::new(steamos_socket).exists() {
        std::env::set_var("DBUS_SYSTEM_BUS_ADDRESS", format!("unix:path={}", steamos_socket));
    }
}
```

This was introduced in v2.0 because the Tauri AppImage on SteamOS Gamescope did not have the system bus correctly wired up. Under **Flatpak** the dynamics are completely different:

- Flatpak's bwrap runtime sets `DBUS_SYSTEM_BUS_ADDRESS` automatically when `--system-talk-name` is granted, pointing at a proxied unix socket (typically `/run/flatpak/bus`).
- `/run/host/...` only exists if the manifest grants `--filesystem=host` or specific `host-os` access. The Tauri sample manifest does **not** grant these.
- The condition `std::env::var("DBUS_SYSTEM_BUS_ADDRESS").is_err()` will be FALSE (the runtime already set it), so the rewrite is skipped. Good.
- BUT if a developer "helpfully" debugs by `flatpak run --filesystem=host …`, the host path will be visible AND the env var may not be set, causing the rewrite path to fire and **break BLE because the host socket isn't reachable through the proxy**.

**Why it happens:**
The code was written for AppImage-on-SteamOS where `/run/host/...` is an artifact of how SteamOS chroots work. Under Flatpak's bwrap, the path semantics flip.

**Consequences:**
- Subtle: BLE works for users who follow the docs, breaks for developers who add `--filesystem=host` for debugging, with no clear error.
- Heisenbug — works in CI, fails on dev machine, or vice versa.

**How to avoid:**
1. Detect Flatpak explicitly in the `lib.rs` env-var rewrite logic:

```rust
let in_flatpak = std::path::Path::new("/.flatpak-info").exists()
    || std::env::var("FLATPAK_ID").is_ok();
if !in_flatpak && std::env::var("DBUS_SYSTEM_BUS_ADDRESS").is_err() {
    // existing AppImage/SteamOS-host fallback
}
```

2. Add a comment explaining why the Flatpak branch is a no-op (the runtime sets it for us).
3. Add a unit/integration test that asserts the rewrite is skipped when `/.flatpak-info` exists.

**Warning signs:**
- `RUST_LOG=debug` shows `DBUS_SYSTEM_BUS_ADDRESS` being set to a `/run/host/...` path inside Flatpak.
- BLE fails on a Deck where the same code+manifest works on a Linux desktop dev box.

**Phase to address:**
**Phase 2 — Sandbox permissions for BLE.** Pair the manifest finish-args change with this Rust fix in the same commit/PR — they're inseparable.

**Sources:**
- Flatpak sandbox D-Bus proxying behavior: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Existing code: `apps/frontend/src-tauri/src/lib.rs` lines 11–20.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `--device=all` instead of `--device=input` | Works on every Steam Deck flatpak version, no version research needed | Over-permissioned sandbox, blocks future Flathub submission, poor security posture | Only as a documented fallback for Decks on flatpak < 1.15.6, with comment explaining why |
| Add `--filesystem=host` to debug | "Just make it work" while debugging | Masks the real BLE/path issue (Pitfall 13), produces a manifest that won't pass review | Never in committed manifests; only in local one-off `--override` for debugging |
| Skip Gaming Mode testing | Faster iteration in Desktop Mode | Latent renderer bugs (Pitfall 5), broken Steam shortcut launch (Pitfall 8) | Only during initial spike phases; required as exit criterion before tagged release |
| Keep AppImage and Flatpak both forever | Hedge against Flatpak issues | Doubles CI time, twice the artifacts to sign/test, contradicts PROJECT.md goal | Only during Phase 8 transition window — one or two releases, then drop AppImage |
| Use `--share=network` `build-args` to skip offline manifest work | Builds work without flatpak-cargo-generator | Cannot ever submit to Flathub later, masks the deb-extract pattern | Only locally for prototyping; never on CI for tagged releases |
| Hardcode `WEBKIT_DISABLE_COMPOSITING_MODE=1` only in Rust code | Worked for AppImage, no manifest change needed | Brittle on Flatpak (Pitfall 5); fails in Gaming Mode silently | Never alone — always also pass via `--env=` in manifest |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BlueZ system bus | Using `--talk-name` (session bus) instead of `--system-talk-name` | `--system-talk-name=org.bluez` and `--system-talk-name=org.bluez.*` |
| Bluetooth permission | Adding `--device=bluetooth` (AF_BLUETOOTH socket) for btleplug | btleplug uses D-Bus only — `--system-talk-name=org.bluez` is sufficient; do NOT add `--device=bluetooth` |
| Gamepad/evdev | Granting `--device=all` blanket access | Prefer `--device=input` (Flatpak ≥ 1.15.6); fall back to `--device=all` only with comment |
| WebKitGTK env vars | Setting only via Rust `set_var` | Belt-and-suspenders: set via `--env=` in manifest AND Rust `set_var` |
| Flatpak SteamOS install | `sudo flatpak install` (system scope) | Always document `flatpak install --user` |
| Sideload bundle distribution | Promising `flatpak update` works | Document manual re-install with `--reinstall` flag |
| Steam shortcut | Adding by binary path | Add via the `.desktop` exported by Flatpak (`~/.local/share/flatpak/exports/...`) |
| flatpak-builder build | Running `cargo build` / `pnpm install` inside the manifest's `build-commands` | Build the `.deb` outside, consume as `type: file` source — sandbox stays offline |
| GitHub Actions Flatpak | `apt install flatpak-builder` on ubuntu-24.04 | Use `flatpak/flatpak-github-actions/flatpak-builder@v6` with `gnome-46` container |
| D-Bus address override | `lib.rs` unconditional `/run/host/run/dbus/...` rewrite | Gate on `!in_flatpak` (check `/.flatpak-info`) |

---

## Performance Traps

This milestone is packaging/distribution; runtime performance is largely unchanged from v2.0. The traps below are CI/build-time and rendering-path traps, not user-facing performance.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-downloading GNOME 46 runtime on every CI run | CI minutes balloon by ~5min/job | Use `cache: true` on flatpak-github-actions, key by manifest hash | Every CI run after the first if cache is misconfigured |
| llvmpipe (software) rendering due to missing `--device=dri` | UI feels sluggish, animations stutter, framerate drops | Always include `--device=dri` and verify GPU is wired up via `glxinfo \| grep "renderer"` | Any GPU-accelerated UI element; worse on Steam Deck APU |
| WebKitGTK DMABUF renderer crash on llvmpipe | Process restart loop, blank window | `--env=WEBKIT_DISABLE_DMABUF_RENDERER=1` or ensure `--device=dri` works | Software-rendering setups (rare on Deck, common in GHA without GPU) |
| Cold-start launch under Flatpak | First launch takes 2–3s longer than AppImage due to bwrap setup + portal init | Accept it; it's a Flatpak fundamental. Don't try to "fix" with `--share=...` flags that defeat the sandbox | Always; not a regression to fix, just expectation-set in docs |
| BLE scan filter merging (existing v2.0 issue) | Other apps' scan filters bleed into ours | Already known from v2.0; no Flatpak-specific change | Multi-app BlueZ usage on host |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `--filesystem=host` to "make BLE work" | Sandbox effectively defeated; app reads any user file | Only `--filesystem=` grants strictly required (none for this app's known features) |
| `--share=network` in build-args left in committed manifest | Cannot pass Flathub review later; CI builds non-reproducible | Use deb-extract pattern (Pitfall 9); keep manifest `--share=network`-free |
| `--talk-name=org.freedesktop.Flatpak` (host escape) | Sandbox escape primitive; allows running arbitrary host commands | Never add unless explicitly required (and this app does not need it) |
| Using `--device=all` when `--device=input` works | Exposes /dev/sd*, /dev/nvme*, etc., to the app | Default to `--device=input`; document fallback explicitly |
| Including private signing keys in the `.flatpak` bundle | Anyone who has the bundle can update it | Sign at install time, not bundle time; or use `flatpak build-sign` with a separate key flow |
| Hardcoded BLE service UUIDs ok, but hardcoded credentials would not be | Robot has no auth — out of scope here, but be aware | BT24 module has no pairing; this is a known accepted risk in PROJECT.md |
| CSP allowing `'unsafe-inline'` for scripts | XSS surface (currently in tauri.conf.json) | Existing pre-Flatpak issue; not a Flatpak regression. Tightening is a separate concern. |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| User installs without `--user` and loses app on SteamOS update | "App disappeared after update" | README: every install command shows `--user` flag, with one-line explanation of why |
| User runs `flatpak update`, expects new version, gets "nothing to do" | Confusion, support burden | Clearly document that sideload bundles upgrade via re-install of the new `.flatpak`, not via `flatpak update` |
| User adds Flatpak as Non-Steam Game in Desktop Mode, switches to Gaming Mode, app fails to launch | Broken end-to-end on the actual target device | Phase 7 exit criterion: verified-on-Deck-Gaming-Mode test, including Steam Input remapping check |
| BLE scan starts but never finds the BT24 (sandbox blocked silently) | "Robot doesn't connect, no error" | Add a diagnostic log line at scan start: `info!("scanning for BT24 …")`, plus a UI hint after 10s of empty results: "Check Bluetooth permission" |
| Gamepad LEDs / haptics inactive | Subtle quality loss; user may not notice | gilrs supports rumble — document that rumble may or may not work depending on `--device=input` vs `--device=all`; verify on Deck |
| User installs from `.flatpak` then sees a security warning from `flatpak-builder` self-signed bundle | "Is this app safe?" | Document the install command + signing approach; consider `flatpak build-sign` with a project key |

---

## "Looks Done But Isn't" Checklist

Before declaring the v2.1 milestone shipped:

- [ ] **Manifest finish-args:** Includes `--system-talk-name=org.bluez` AND `--system-talk-name=org.bluez.*` — verify with `busctl --system list` from inside `flatpak run --command=sh`
- [ ] **Manifest finish-args:** Includes `--device=input` (with documented `--device=all` fallback for older Decks); verify gilrs sees the Deck controller
- [ ] **Manifest finish-args:** Includes `--socket=wayland`, `--socket=fallback-x11`, `--device=dri`, `--share=ipc`
- [ ] **Manifest env:** `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` set in addition to Rust `set_var`
- [ ] **Rust code:** `lib.rs` D-Bus address rewrite gated on `!in_flatpak` check
- [ ] **tauri.conf.json:** `bundle.targets` switched from `["appimage"]` to `["deb"]` (deb is input to flatpak-builder)
- [ ] **CI:** Uses `flatpak/flatpak-github-actions/flatpak-builder@v6`, not `apt install flatpak-builder`
- [ ] **CI:** Builds for x86_64 only; arm64 dropped (Steam Deck is x86_64)
- [ ] **CI:** OSTree cache enabled (`cache: true`) on the flatpak-builder action
- [ ] **CI:** Custom `tauri-cli` fork (`feat/truly-portable-appimage`) removed — was AppImage-specific
- [ ] **Release:** Signed `.flatpak` bundle attached to GitHub Release
- [ ] **Docs:** Install command uses `flatpak install --user`
- [ ] **Docs:** "Auto-update" copy reflects sideload reality (manual re-install, not `flatpak update`)
- [ ] **Docs:** "Add as Non-Steam Game" workflow tested in Desktop Mode with screenshots
- [ ] **Test on real Deck — Desktop Mode:** Install, launch, BLE scan finds BT24, gamepad input drives robot
- [ ] **Test on real Deck — Gaming Mode:** Same scenario; window renders, controls work, no black screen
- [ ] **Test on real Deck — Post-SteamOS-update:** Reboot/update, app and data still present at `~/.var/app/com.ks0555.robotcontroller/`
- [ ] **AppImage workflow:** Kept in CI for at least one transition release; deletion in a separate PR after Flatpak verified

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong `finish-args` shipped (BLE blocked) | LOW | Tag a patch release with corrected manifest. Users `flatpak install --user --reinstall` the new `.flatpak`. |
| `lib.rs` D-Bus rewrite broke BLE under Flatpak | LOW | Hotfix Rust code with `in_flatpak` gate, rebuild, ship patch release. |
| Flatpak fails on Gaming Mode after AppImage was deleted | MEDIUM | Restore AppImage CI job from git history (it's still in the v2.0 release tag); ship a new release with both artifacts. Investigate Gaming Mode rendering. |
| User on SteamOS lost app after system update (was `--system` install) | LOW | Re-install with `--user` flag. User-data is at `~/.var/app/...` and survives — no data loss. |
| Sideload bundle ships secret key by mistake | HIGH | Rotate signing key, revoke old releases, force re-install. This is a one-way trip — prevention only. |
| flatpak-builder fails in CI on `ubuntu-24.04` apt-installed version | LOW | Switch to `flatpak/flatpak-github-actions/flatpak-builder@v6` action; was already the right answer. |
| Discover that `--device=input` fails on user's Deck (Flatpak < 1.15.6) | LOW–MEDIUM | Document `--device=all` fallback. Re-evaluate: does the user need to update SteamOS / Flatpak? Often yes. |
| `flatpak run` from Steam shortcut fails in Gaming Mode | MEDIUM | Edit Steam shortcut Launch Options manually; document the fix. If systemic, consider a wrapper `.sh` shipped in `/app/bin/` that handles env setup. |

---

## Pitfall-to-Phase Mapping

The phases below are recommendations for the v2.1 roadmap. They are designed so each pitfall has exactly one preventing phase.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Tauri has no `flatpak` bundle target | Phase 1 — Bundle pipeline restructure | `cargo tauri build` produces `.deb`; `packaging/flatpak/<id>.yaml` skeleton in repo |
| #2 Missing `--system-talk-name=org.bluez` | Phase 2 — Sandbox permissions for BLE | `busctl --system list \| grep bluez` from inside Flatpak shell shows org.bluez visible |
| #3 Confusing `--device=bluetooth` vs D-Bus | Phase 2 — Sandbox permissions for BLE | Manifest reviewed; only `--system-talk-name=org.bluez` present, no `--device=bluetooth` |
| #4 gilrs cannot read /dev/input | Phase 3 — Sandbox permissions for gamepad | gilrs detects ≥1 gamepad on a real Deck; gamepad-direction events fire |
| #5 WebKit env-var not propagated | Phase 4 — Manifest renderer/runtime tuning | Window renders correctly in BOTH Desktop and Gaming Mode |
| #6 System-scope install wiped by SteamOS update | Phase 5 — Steam Deck install/run docs | README install command uses `--user`; tested across one SteamOS update |
| #7 Sideload doesn't auto-update | Phase 6 — Update workflow docs | README accurately describes manual re-install upgrade path |
| #8 Add Non-Steam Game / Gaming Mode | Phase 7 — Gaming Mode integration | Steam shortcut launches successfully in Gaming Mode |
| #9 flatpak-builder offline build fails | Phase 1 — Bundle pipeline restructure | Manifest uses `type: file` `.deb` source; no `cargo`/`pnpm` inside `build-commands` |
| #10 Outdated flatpak-builder on ubuntu-24.04 | Phase 8 — CI migration | CI workflow uses official `flatpak-github-actions` action with `gnome-46` container |
| #11 AppImage removed too early | Phase 8 — CI migration | At least one tagged release ships both artifacts before AppImage job is deleted |
| #12 Resource path / CSP under `/app/lib` | Phase 4 — Manifest renderer/runtime tuning | Grep audit shows no hardcoded `/usr/` paths; `app.path()` APIs used throughout |
| #13 `lib.rs` D-Bus rewrite incompatible with Flatpak | Phase 2 — Sandbox permissions for BLE | Rust code includes `in_flatpak` gate; verified by integration test or manual `RUST_LOG=debug` log inspection |

---

## Sources

**Tauri:**
- Tauri v2 Flatpak distribution doc (raw, `draft: true`): https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/flatpak.mdx
- Tauri Issue #3619 ([feat] Bundle Tauri apps as Flatpak — open as proposal): https://github.com/tauri-apps/tauri/issues/3619
- Tauri Discussion #4426 (Approach to creating Flatpak bundles): https://github.com/tauri-apps/tauri/discussions/4426
- Tauri Issue #13599 (tray-icon doesn't show under Flatpak — closed with `temp_dir_path` fix): https://github.com/tauri-apps/tauri/issues/13599
- Tauri Configuration reference: https://v2.tauri.app/reference/config/
- Tauri AppImage doc: https://v2.tauri.app/distribute/appimage/

**Flatpak:**
- Flatpak Sandbox Permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak Single-file bundles: https://docs.flatpak.org/en/latest/single-file-bundles.html
- Flatpak Builder doc: https://docs.flatpak.org/en/latest/flatpak-builder.html
- Flatpak Builder Command Reference: https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html
- flatpak-install(1): https://man7.org/linux/man-pages/man1/flatpak-install.1.html
- flatpak-update(1): https://man7.org/linux/man-pages/man1/flatpak-update.1.html
- Flatpak Issue #1719 (bluetooth permission): https://github.com/flatpak/flatpak/issues/1719
- xdg-desktop-portal Issue #536 (input device portal): https://github.com/flatpak/xdg-desktop-portal/issues/536
- flatpak-builder-tools cargo README: https://github.com/flatpak/flatpak-builder-tools/blob/master/cargo/README.md
- flatpak/flatpak-github-actions: https://github.com/flatpak/flatpak-github-actions

**WebKitGTK:**
- WebKitGTK accelerated compositing (Carlos Garcia Campos): https://blogs.igalia.com/carlosgc/2023/04/03/webkitgtk-accelerated-compositing-rendering/
- WebKit Bug 165246 (Wayland compositing): https://bugs.webkit.org/show_bug.cgi?id=165246
- Qubes issue #9595 (`WEBKIT_DISABLE_COMPOSITING_MODE` requirement): https://github.com/QubesOS/qubes-issues/issues/9595

**btleplug / BlueZ:**
- btleplug README: https://github.com/deviceplug/btleplug
- btleplug Issue #150 (D-Bus limits): https://github.com/deviceplug/btleplug/issues/150
- BlueZ project: https://www.bluez.org/

**Steam Deck / SteamOS:**
- Flatpak Commands Cheat Sheet for Steam Deck (PulseGeek): https://pulsegeek.com/articles/flatpak-commands-cheat-sheet-for-steam-deck/
- "Steam Deck, HID, and libmanette adventures" (Alice Mikhaylenko / GNOME blog): https://blogs.gnome.org/alicem/2024/10/24/steam-deck-hid-and-libmanette-adventures/
- ValveSoftware/SteamOS Issue #830 (Flatpak quirks): https://github.com/ValveSoftware/SteamOS/issues/830
- Heroic Games Launcher Issue #4708 (Flatpak runtime 24.08 + Steam Input regression): https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/4708
- BoilR Discussion #425 (Add Flatpak as Non-Steam Game): https://github.com/PhilipK/BoilR/discussions/425
- Steam Deck Bug — Flatpaks as non-Steam games: https://steamcommunity.com/app/1675200/discussions/1/3824162683805228541/

**CI:**
- runner-images Issue #11359 (flatpak-builder error on ubuntu-24.04): https://github.com/actions/runner-images/issues/11359
- Implementing Flathub CICD with GitHub Actions (Flathub Discourse): https://discourse.flathub.org/t/implementing-flathub-cicd-with-github-actions/4902

**Reference packaging walkthroughs:**
- Vincent Jousse — Packaging a Tauri v2 app on Linux for Flatpak/Snapcraft (Rust + npm + Elm): https://vincent.jousse.org/blog/en/packaging-tauri-v2-flatpak-snapcraft-elm/

---
*Pitfalls research for: Flatpak packaging of Tauri v2 + btleplug + gilrs on Steam Deck (v2.1 milestone)*
*Researched: 2026-05-09*
