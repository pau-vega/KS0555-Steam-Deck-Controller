# Phase 11: Bundle Pipeline Restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 11-Bundle Pipeline Restructure
**Areas discussed:** Custom fork removal scope, Flatpak runtime choice, Deb layout recording method

---

## Custom Fork Removal Scope

### build-steamdeck.sh
| Option | Description | Selected |
|--------|-------------|----------|
| Update it to build .deb with stock CLI | Replace fork install with stock tauri-cli, change build to --bundles deb | |
| Remove it entirely | CI handles all builds now, script is redundant | ✓ |
| Leave as-is until Phase 16 | Keep building AppImage locally, decommission later | |

**User's choice:** Remove it entirely
**Notes:** CI handles all builds. Local build script no longer needed.

### build-arm64 job
| Option | Description | Selected |
|--------|-------------|----------|
| Drop the whole build-arm64 job now | Steam Deck is x86_64 only, no point maintaining | ✓ |
| Replace fork with stock CLI, keep job | Keep functional until Phase 15 decommission | |

**User's choice:** Drop the whole build-arm64 job now
**Notes:** Fulfills CI-03 requirement early.

### build-x64: deb only or both
| Option | Description | Selected |
|--------|-------------|----------|
| Deb only with stock CLI | Replace fork, change to --bundles deb. Simpler. | ✓ |
| Both deb + AppImage (parallel-run) | Keep AppImage alongside during v2.1 transition | |

**User's choice:** Deb only with stock CLI
**Notes:** AppImage is dead. No transition overlap.

### Parallel-run window
| Option | Description | Selected |
|--------|-------------|----------|
| Drop AppImage now, skip parallel-run | Go straight to deb-only. No transition release. | ✓ |
| Keep AppImage job alongside deb | Preserve CI-02/CI-05 flow for one transition release | |

**User's choice:** Drop AppImage now, skip parallel-run
**Notes:** Requires downstream phases to note CI-02 and CI-05 are obsoleted.

### Upload .deb as artifact
| Option | Description | Selected |
|--------|-------------|----------|
| Upload .deb as build artifact | Phase 15 downloads it for flatpak-builder | |
| Deb is local-only intermediate | Phase 15 rebuilds deb as part of its job | ✓ |

**User's choice:** If it's not needed you can delete it
**Notes:** Remove upload-artifact and action-gh-release steps from build-x64.

### build-macos job
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, macOS job stays | DMG builds for macOS remain as-is | |
| Remove it — not needed for flatpak | macOS out of scope for v2.1 | ✓ |

**User's choice:** If it's not needed for flatpak you can remove it
**Notes:** macOS job removed entirely. build.yml reduced to single x64 job.

---

## Flatpak Runtime Choice

### Runtime selection
| Option | Description | Selected |
|--------|-------------|----------|
| org.freedesktop.Platform//24.08 (Recommended) | Smaller (~300 MB), no GNOME deps. Works for Tauri WebKitGTK window. | ✓ |
| org.gnome.Platform//46 | Includes GNOME/GTK libs (~1 GB). Larger download. Fallback. | |

**User's choice:** org.freedesktop.Platform//24.08 (Recommended)
**Notes:** SDK: org.freedesktop.Sdk//24.08. No GNOME APIs needed.

### GL extension
| Option | Description | Selected |
|--------|-------------|----------|
| Just the base runtime + SDK | No extensions, minimal | |
| Add GL extension | GPU-accelerated WebKit rendering on Steam Deck | ✓ |

**User's choice:** Add GL extension
**Notes:** org.freedesktop.Platform.GL.default for Gamescope/Gaming Mode.

### CI container image
| Option | Description | Selected |
|--------|-------------|----------|
| Lock it in now | Record exact container tag in CONTEXT.md | |
| Let Phase 15 decide | Runtime locks now, CI specifics later | ✓ |

**User's choice:** Let Phase 15 decide
**Notes:** Container image tied to runtime but Phase 15 picks the tag.

---

## Deb Layout Recording Method

### Recording approach
| Option | Description | Selected |
|--------|-------------|----------|
| Record in CONTEXT.md decisions | dpkg -c output in phase context | |
| Separate deb-layout.txt file | Raw output in dedicated file | |
| Don't record — Phase 12 discovers it | Phase 12 builds deb and runs dpkg -c itself | ✓ |

**User's choice:** Don't record — Phase 12 discovers it
**Notes:** PKG-03 in Phase 11 is verification-only. Layout discovery is Phase 12's job.

### tauri.conf.json deb config
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: just change targets to deb | Only targets change, Tauri defaults for rest | |
| Add deb metadata too | Include depends: [], desktop template | ✓ |

**User's choice:** Add deb metadata too
**Notes:** Declare `depends: []` since Tauri bundles everything. Let Tauri auto-generate .desktop.

---

## the agent's Discretion

- Exact deb config fields (section, priority, desktopTemplate) — agent picks sensible defaults
- build.yml workflow `name:` rename — from "Build Tauri AppImage" to deb-appropriate name
- Stock tauri-cli install method: `cargo install tauri-cli` vs `pnpm dlx @tauri-apps/cli`

## Deferred Ideas

- Parallel-run transition release (AppImage + Flatpak shipped together for one release) — bypassed by D-05. CI-02 and CI-05 are obsoleted.
- CI container image for flatpak-builder — Phase 15 picks the exact tag.
