---
quick_id: 260514-001
slug: flatpak-release-upload-safety
date: 2026-05-14
status: complete
---

# Summary: Flatpak Release Upload Safety

## Goal

Ensure `.github/workflows/build.yml` reliably uploads `.flatpak` (and `.sha256`) to GitHub Releases — no silent failures.

## Changes

### `.github/workflows/build.yml`

1. **New step `verify flatpak bundle`** (after `build flatpak`): asserts file exists, is non-empty, and ≥1 MiB. Catches zero-byte / missing bundles before they become "successful uploads with no assets".
2. **`generate sha256 checksum`**: added `test -s` assertion on the produced `.sha256` file.
3. **`upload deb artifact` + `upload flatpak artifact`**: set `if-no-files-found: error` (default is `warn` — silently passes if glob matches nothing).
4. **`upload to release` (softprops/action-gh-release@v2)**: set `fail_on_unmatched_files: true` (default is `false` — silently succeeds if glob matches nothing).
5. **Tag triggers**: replaced dead `["v*", "*-v*"]` patterns with `["[0-9]*", "v*"]`. New release-please config tags releases as plain semver (e.g. `0.0.1`), so the old patterns never fire. `v*` retained for legacy/manual tags.
6. **Removed unused `workflow_dispatch.inputs.skip_release`** input — referenced nowhere in the workflow.

## Verification

- `python3 yaml.safe_load` — YAML parses
- `actionlint .github/workflows/build.yml` — only pre-existing info-level shellcheck warnings (SC2012/SC2086/SC2193), none introduced by these changes, none blocking

## End-to-end flow now

1. release-please creates GitHub Release (via PAT, plain semver tag like `0.0.1`)
2. `release-please.yml.build-and-upload` calls `build.yml` via `workflow_call` with `tag_name: 0.0.1`
3. `build.yml` builds deb → builds flatpak → **verify flatpak bundle (NEW)** → checksum → upload-artifact (errors on missing) → upload-to-release with `fail_on_unmatched_files: true`
4. Any missing/empty `.flatpak` artifact now fails the workflow loudly instead of producing an asset-less release

## Files touched

- `.github/workflows/build.yml`
- `.planning/quick/260514-001-flatpak-release-upload-safety/PLAN.md`
- `.planning/quick/260514-001-flatpak-release-upload-safety/SUMMARY.md`
- `.planning/STATE.md` (Quick Tasks table)
