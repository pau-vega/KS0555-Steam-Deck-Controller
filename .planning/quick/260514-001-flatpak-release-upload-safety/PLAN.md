---
quick_id: 260514-001
slug: flatpak-release-upload-safety
date: 2026-05-14
status: in-progress
---

# Quick Task: Flatpak Release Upload Safety

## Description

Ensure GitHub workflows reliably attach `.flatpak` (and `.sha256`) artifacts to GitHub Releases. Audit revealed silent-failure paths and dead config.

## Findings (audit of `.github/workflows/`)

1. **`build.yml` line 153 — `actions/upload-artifact@v4` default `if-no-files-found: warn`**: if `.deb` glob is empty, CI passes silently.
2. **`build.yml` lines 179–186 — `actions/upload-artifact@v4` for flatpak**: same default, no validation flatpak bundle exists or is non-empty.
3. **`build.yml` lines 188–195 — `softprops/action-gh-release@v2` default `fail_on_unmatched_files: false`**: release upload silently succeeds with zero assets if globs miss.
4. **`build.yml` lines 168–173 — no post-build validation**: `flatpak build-bundle` runs but no `test -f` / `test -s` check on output before upload steps; a zero-byte or missing bundle would propagate.
5. **`build.yml` line 5 — `tags: ["v*", "*-v*"]` dead config**: new release-please config (`include-v-in-tag: false`, `include-component-in-tag: false`) tags releases as plain `0.0.1`; neither pattern matches. Tag-push path is dead; only `workflow_call` from release-please.yml fires the upload. Misleading — should be removed or fixed.

## Tasks

1. Add `verify flatpak bundle` step after `build flatpak` — assert file exists and size > 0.
2. Set `if-no-files-found: error` on both `actions/upload-artifact@v4` steps (deb + flatpak).
3. Set `fail_on_unmatched_files: true` on `softprops/action-gh-release@v2` upload-to-release step.
4. Fix `on.push.tags` patterns to match new release-please tag format (`'[0-9]+.[0-9]+.[0-9]+*'`) — keeps tag-push path alive for manual tags or accidental drift detection.
5. Remove unused `workflow_dispatch.inputs.skip_release` (referenced nowhere).

## Files

- `.github/workflows/build.yml` — all changes here

## Acceptance

- Workflow YAML lints (no syntax errors): `actionlint .github/workflows/build.yml` or visual diff
- Each upload step has explicit failure-on-missing config
- Dead tag triggers removed/fixed
- Single atomic commit per logical change
