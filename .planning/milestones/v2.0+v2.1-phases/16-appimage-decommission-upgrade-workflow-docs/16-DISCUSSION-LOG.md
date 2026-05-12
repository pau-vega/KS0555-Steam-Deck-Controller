# Phase 16: AppImage Decommission + Upgrade Workflow Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 16-appimage-decommission-upgrade-workflow-docs
**Areas discussed:** CI Consolidation, Polling Launcher, Architecture Docs, justfile Recipes

---

## CI Consolidation

### Job removal approach

| Option | Description | Selected |
|--------|-------------|----------|
| Merge into one job | Single job does cargo tauri build → flatpak-builder → upload | |
| Keep split, rename only | Keep build-x64 as deb producer, rename to build-deb-x64 | |
| Remove build-x64 only | build-flatpak-x64 gains its own Tauri build step | ✓ |

**User's choice:** Remove build-x64 only — flatpak job becomes self-contained.
**Notes:** The removed job produces .deb consumed by flatpak-builder. After removal, the flatpak job does its own `cargo tauri build --bundles deb`.

### VAL-08 check

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in flatpak job | Add git diff check to build-flatpak-x64 | |
| Separate validate job | Extract VAL-08 into standalone job | |
| Drop it | Already passed in Phase 15, pre-commit hooks enforce | ✓ |

**User's choice:** Drop it.

### Runner choice

| Option | Description | Selected |
|--------|-------------|----------|
| Keep ubuntu-24.04 | Proven, zero risk | ✓ |
| Fully containerized | Run entire job in flathub-infra container | |

**User's choice:** Keep ubuntu-24.04.

### Version source

| Option | Description | Selected |
|--------|-------------|----------|
| Keep tag-based | Extract from github.ref_name | |
| Cargo.toml | Single source of truth | ✓ |
| Both with assertion | Extract both, assert match | |

**User's choice:** Read version from Cargo.toml.

### Concurrency behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Same behavior | Keep cancel-in-progress: true | |
| Loosen it | Remove cancel-in-progress (flatpak builds are longer) | ✓ |

**User's choice:** Loosen it.

### .deb artifact upload

| Option | Description | Selected |
|--------|-------------|----------|
| Skip artifact | .deb consumed inline, no archive needed | ✓ |
| Upload as artifact | Keep for debugging | |

**User's choice:** Skip artifact.

### workflow_dispatch

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | Preserve skip_release for smoke-testing | ✓ |
| Remove it | Phase 16 simplifies | |

**User's choice:** Keep it.

### install-on-steamdeck.sh

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it here | Part of AppImage decommission cleanup | ✓ |
| Docs phase handles it | DOCS-01 naturally drops references | |

**User's choice:** Remove it here.

### Cleanup scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Remove build-x64 job only | |
| Full cleanup | Remove all AppImage references in comments/docs | ✓ |

**User's choice:** Full cleanup.

### Job name

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to build | Single job, simple name | ✓ |
| Rename to build-flatpak | Drop -x64 suffix | |
| Keep name | Minimal diff | |

**User's choice:** Rename to "build".

### pnpm cache

| Option | Description | Selected |
|--------|-------------|----------|
| Add pnpm cache | Cache ~/.pnpm-store | ✓ |
| Skip pnpm cache | pnpm install is fast enough | |

**User's choice:** Add pnpm cache.

### Top-level permissions

| Option | Description | Selected |
|--------|-------------|----------|
| Keep contents: read | Job-level override still works | ✓ |
| Set contents: write | One job remains, simpler | |

**User's choice:** Keep contents: read.

### Workflow name

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | "Build and Release" still accurate | ✓ |
| Simplify | Change to more specific name | |

**User's choice:** Keep it.

### Validation steps

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing checks | Verify .deb + flatpak sources | ✓ |
| Add flatpak lint | Run appstream-util validate | |
| Minimal checks | Trust cargo tauri build exit code | |

**User's choice:** Keep existing checks.

### OSTree cache key

| Option | Description | Selected |
|--------|-------------|----------|
| Keep same key | No changes needed | ✓ |
| Add v2 suffix | Force fresh cache on first run | |

**User's choice:** Keep same key.

### CI comment about build.sh boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Add comment | Document that build.sh is local-only | |
| Skip comment | CI YAML should be self-documenting | ✓ |

**User's choice:** Skip comment.

---

## Polling Launcher

### Language

| Option | Description | Selected |
|--------|-------------|----------|
| Bash script | Zero dependencies on Steam Deck | ✓ |
| Python script | More readable, ships on SteamOS | |

**User's choice:** Bash script.

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| Root level | Easy to find, standard for user-facing scripts | ✓ |
| flatpak/ directory | Keep everything Flatpak-related together | |
| scripts/ directory | Separate dir for tooling | |

**User's choice:** Root level — `upgrade-robot-controller.sh`.

### Features

| Option | Description | Selected |
|--------|-------------|----------|
| Download + reinstall only | Simple, one-purpose | |
| Also check current version | Compare versions, skip if up-to-date | |
| Full upgrade assistant | Version check, download, changelog, confirm, install, verify, cleanup | ✓ |

**User's choice:** Full upgrade assistant.

### Purpose

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade only | User already has app installed | |
| Install + upgrade | Script works for both fresh install and upgrade | ✓ |

**User's choice:** Install + upgrade (dual-purpose).

### Dependencies

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained | Standalone file, no source imports | ✓ |
| Source build.sh | Share helpers with dev script | |

**User's choice:** Self-contained.

### Changelog display

| Option | Description | Selected |
|--------|-------------|----------|
| Full release body | Show release notes from GitHub API | ✓ |
| Tag + date only | Concise, link to release URL | |

**User's choice:** Full release body.

### Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm before install | Show what's changing, ask y/N | ✓ |
| Auto-install | Download and reinstall automatically | |

**User's choice:** Confirm before install.

### Cleanup old downloads

| Option | Description | Selected |
|--------|-------------|----------|
| Clean up old downloads | Remove previous .flatpak files | ✓ |
| Keep all downloads | Users manage themselves | |

**User's choice:** Clean up old downloads.

---

## Architecture Docs

### Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Concise section | ~30 lines in existing README | |
| Dedicated ARCHITECTURE.md | Full coverage, README links to it | ✓ |

**User's choice:** Dedicated `apps/frontend/src-tauri/ARCHITECTURE.md`.

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Build chain + sandbox | Core Flatpak architecture only | |
| Full system | Above + Tauri pipeline, event flow, Vite, monorepo | ✓ |

**User's choice:** Full system coverage.

### flatpak/README.md

| Option | Description | Selected |
|--------|-------------|----------|
| Review and update | Verify coverage of all finish-args + D-Bus gate | ✓ |
| Already sufficient | Phase 12+13 docs are current | |

**User's choice:** Review and update.

### Root README rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted replacement | Replace AppImage install with Flatpak | |
| Full rewrite | Rewrite install section completely + update stale v2.0 references | ✓ |

**User's choice:** Full rewrite.

---

## justfile Recipes

### flatpak-build

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap build.sh | Delegates to existing script | |
| Direct flatpak-builder | Run flatpak-builder directly in justfile | ✓ |

**User's choice:** Direct flatpak-builder.

### flatpak-deploy

| Option | Description | Selected |
|--------|-------------|----------|
| scp + install | Transfer file + remote install | |
| scp only | Transfer only, install is manual | ✓ |

**User's choice:** scp only.

### Group

| Option | Description | Selected |
|--------|-------------|----------|
| New flatpak group | Separate from Steam Deck group | ✓ |
| Merge into steamdeck | Consolidate all Deck commands | |

**User's choice:** New `[group('flatpak')]`.

---

## the agent's Discretion

- Exact structure and formatting of ARCHITECTURE.md
- upgrade-robot-controller.sh implementation details (error handling, flags, jq parsing, temp dir)
- Root README rewrite phrasing and walkthrough wording
- justfile recipe argument handling
- Whether VALIDATION-CHECKLIST.md needs updates
- docs/RUNNING.md updates

## Deferred Ideas

None — discussion stayed within Phase 16 scope.
