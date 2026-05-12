# Phase 12: Manifest + AppStream + Local Build - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 12-manifest-appstream-local-build
**Areas discussed:** Manifest Structure, Icon Pipeline, AppStream Metainfo Depth, build.sh Interface + macOS Gap

---

## Manifest Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Include display args now | --socket=wayland, --socket=fallback-x11, --share=ipc, --device=dri. Needed for flatpak run to open a window (VAL-05). BLE/gamepad args deferred to Phase 13. | ✓ |
| Leave finish-args empty | Phase 13 handles all sandbox permissions. | |

**User's choice:** Include display args now (Recommended)
**Notes:** BLE/gamepad finish-args belong in Phase 13. Phase 12 only needs display to satisfy VAL-05.

| Option | Description | Selected |
|--------|-------------|----------|
| Relative path with placeholder | build.sh copies deb into flatpak/ before invoking flatpak-builder. Manifest uses a local filename like robot-controller.deb. | ✓ |
| Hardcoded exact path with version | Must update version string on each release. | |
| Generate manifest dynamically | build.sh generates manifest YAML on-the-fly. | |

**User's choice:** Relative path with placeholder (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri v2 defaults + CI verification | Use known Tauri v2 deb layout: usr/bin/robot-controller, usr/share/applications/robot-controller.desktop, usr/share/icons/hicolor/256x256/apps/robot-controller.png. Phase 15 CI will dpkg -c to confirm. | ✓ |
| Flexible extraction with glob | Use bash globs in build-commands. | |
| Document expected layout only | Document in README, build.sh verifies. | |

**User's choice:** Tauri v2 defaults + CI verification (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Single module | One module with all build-commands inline. Deb extraction, binary install, desktop rename, icon install all in one sequence. | ✓ |
| Two modules: extract + install | Separate extraction and installation modules. | |
| Single module + external script | Manifest calls external install.sh. | |

**User's choice:** Single module (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Add it now | Belt-and-suspenders — lib.rs set_var handles the process but adding as finish-arg ensures it's in the flatpak environment. | ✓ |
| Leave for Phase 13 | Phase 13 manifests all sandbox/env concerns. | |

**User's choice:** Add it now (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip cleanup | Deb only contains app code. No SDK headers or man pages to strip. | ✓ |
| Add minimal cleanup | Add cleanup: [/include, /share/man, /share/doc] for hygiene. | |

**User's choice:** Skip cleanup (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Glob both formats | ar -x + tar -xf data.tar.* — wildcard handles any format (zst, xz, gz). | ✓ |
| Assume zst only | Hardcode data.tar.zst. | |

**User's choice:** Glob both formats (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip pre-build validation | flatpak-builder validates manifest at build time. | ✓ |
| flatpak-builder --show-args sanity check | Quick check that manifest parses before full build. | |

**User's choice:** Skip pre-build validation (Recommended)

---

## Icon Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-generated PNGs committed | One-time generation via ImageMagick, commit output files as manifest sources. | ✓ |
| Generate in build-commands via ImageMagick | Add ImageMagick module, generate at build time. | |
| Include only what Tauri provides | Install 256x256 as-is, skip other sizes. | |

**User's choice:** Pre-generated PNGs committed to repo (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| flatpak/icons/ with manifest file sources | Generate into flatpak/icons/ (32.png, 128.png, 256@2.png). Manifest adds them as file sources. | ✓ |
| Alongside Tauri icons + deb extraction | Place icons in apps/frontend/src-tauri/icons/flatpak/. | |

**User's choice:** flatpak/icons/ with manifest file sources (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Manual one-time | Commit the 3 scaled PNGs. Document convert command in README for future icon changes. | ✓ |
| Add flatpak/generate-icons.sh | Script that takes icon.png and generates scaled versions. | |

**User's choice:** Manual one-time (Recommended)

---

## AppStream Metainfo Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Standard — add developer + categories | developer_name, categories (Utility), url homepage=repo, launchable desktop-id. Expected by Discover. | ✓ |
| Minimal — required fields only | id, name, summary, description, license, releases stub. Satisfies flatpak-builder. | |
| Rich — add screenshots + OARS + branding | Standard + screenshots + content rating + brand colors. | |

**User's choice:** Standard — add developer + categories (Recommended)
**Notes:** User initially selected "Rich" then returned to the question and selected "Standard". No screenshots, OARS, or branding.

| Option | Description | Selected |
|--------|-------------|----------|
| List current version with date | Release entry for 0.1.5 with today's date. CI or release script updates it later. | ✓ |
| Stub release — no version info | Empty or placeholder release block. | |

**User's choice:** List current version with date (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| MIT | Standard open-source license. No LICENSE file in repo yet — metainfo declaration covers the AppStream requirement. | ✓ |
| Proprietary | LicenseRef-proprietary with custom terms. | |
| Check with you first | User specifies the license. | |

**User's choice:** MIT (Recommended)

---

## build.sh Interface + macOS Gap

| Option | Description | Selected |
|--------|-------------|----------|
| Accept deb path as parameter | build.sh <path-to-deb>. Explicit, works for CI and local. | ✓ |
| Auto-locate by glob pattern | Finds newest deb matching robot-controller_*_amd64.deb. | |
| Both — parameter overrides auto-locate | build.sh [optional-deb-path]. Auto-locates if no arg. | |

**User's choice:** Accept deb path as parameter (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Structural validation only | Validate YAML syntax, metainfo XML schema, file existence. Runtime flatpak run deferred to Phase 14. | ✓ |
| Require Linux CI for Phase 12 | Add CI job running flatpak-builder in this phase. | |
| Trust manifest correctness | Write manifest following best practices, minimal verification. | |

**User's choice:** Structural validation only (Recommended)

---

## the agent's Discretion

- Exact manifest YAML field ordering, indentation, tags
- AppStream description paragraph text
- Exact shell syntax in build-commands
- README.md content and structure
- Icon generation commands
- install vs cp choice in build-commands

## Deferred Ideas

None — discussion stayed within Phase 12 scope.
