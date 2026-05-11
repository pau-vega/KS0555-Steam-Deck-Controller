# Phase 15: CI Migration (Parallel-Run) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 15-ci-migration-parallel-run
**Areas discussed:** Release upload strategy, Job dependency model, Artifact retention policy, OSTree cache config

---

## Release Upload Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Separate job per artifact | build-x64 uploads .deb, build-flatpak-x64 uploads .flatpak. Each job responsible for its own artifact. Clean separation. | (superseded by D-21) |
| Single release job depends on both | New release-upload job (needs: [build-x64, build-flatpak-x64]) downloads both and uploads in one call. | |
| build-flatpak uploads everything | build-flatpak-x64 downloads .deb, builds flatpak, then uploads both. | |

| Option | Description | Selected |
|--------|-------------|----------|
| softprops/action-gh-release@v2 | Most popular release action (5k+ stars). Handles glob patterns, overwrite, append. Simple single-step. | ✓ |
| ncipollo/release-action@v1 | More features (create + upload), heavier API surface. | |
| Plain gh CLI | `gh release upload` in run step. No external action dependency. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tag push only | Upload only on `v*` tag push. Workflow_dispatch builds + verifies without uploading. | ✓ |
| Tags + workflow_dispatch | Upload on both triggers. More flexible for manual testing. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Per-job contents write | Job-level permissions. Only uploading jobs get write. Least privilege. | ✓ |
| Top-level contents write | Single permissions block. Simpler but all jobs get write. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Versioned | RobotController-0.1.5-x86_64.flatpak. Clear per-release, no conflicts. | ✓ |
| Static | RobotController-x86_64.flatpak always points to latest. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Skip release if any failure | Don't publish a partial release. All-or-nothing. | ✓ |
| Upload deb always | If flatpak fails, release still gets .deb as fallback. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, upload .sha256 | Generate SHA256 checksums. Users can verify downloads. | ✓ |
| No checksums | Sideload-only desktop app. Not security-critical. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generate changelog | Changelog from git history since last tag. | |
| Use GitHub default | GitHub auto-generates from tag message. Simpler. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| GITHUB_TOKEN | Built-in token. Standard practice, no secret management. | ✓ |
| Personal Access Token | PAT with repo scope. Allows cross-repo but adds overhead. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Draft (manual publish) | Upload assets, user manually publishes after review. Safer. | |
| Published immediately | Upload and auto-publish. Immediately visible to users. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel in-progress | Concurrency group on ref. Cancels older runs on rapid tag pushes. | ✓ |
| No concurrency limit | Let all runs complete. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Per-job timeouts | Explicit: build-x64 30m, build-flatpak-x64 45m. | |
| GitHub default only | No explicit timeouts. 6h default. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Skip release option | workflow_dispatch input: `skip_release` boolean for testing. | ✓ |
| No inputs needed | Simpler YAML. Tags always upload. | |

---

## Job Dependency Model

| Option | Description | Selected |
|--------|-------------|----------|
| Artifact passing | build-flatpak-x64 depends on build-x64 (needs), downloads .deb. No rebuild. | ✓ |
| Monolithic single job | One job builds deb then flatpak sequentially. No artifact passing. | |
| Full rebuild independent | build-flatpak-x64 rebuilds from source. Fully parallel but duplicate work. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Checkout + deb download | build-flatpak-x64 checks out repo (icons + metainfo already there). Only .deb is downloaded. | ✓ |
| One artifact bundle | build-x64 uploads everything in one artifact. No checkout needed. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Use build.sh | Existing wrapper script. Consistent with local dev. | |
| Direct flatpak-builder | Call flatpak-builder directly. Cleaner CI YAML. | |

**User's choice (build.sh role):** User said "Follow the standard in the industry" → agent resolved to "CI manual prep steps". The flatpak-github-actions action handles flatpak-builder; CI run steps handle deb copy + file verification. build.sh stays as local-dev tool only.

| Option | Description | Selected |
|--------|-------------|----------|
| Action wraps build.sh | Action runs flatpak-builder. build.sh handles setup only. | |
| build.sh only, no action | Run build.sh directly. Simpler but loses OSTree cache and container benefits. | ✓ (implicitly via "standard in industry") |

**Resolution:** CI uses `flatpak/flatpak-github-actions/flatpak-builder@v6` for flatpak-builder with OSTree cache. CI run steps handle prep (download deb, copy to flatpak/, verify sources). `build.sh` is not invoked in CI — it's the local dev tool.

---

## Artifact Retention Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Both every release | Upload .deb and .flatpak to every tagged release. | ✓ (initial) |
| Flatpak only | Only upload .flatpak. .deb is internal intermediate. | ✓ (later) |
| Flatpak primary, deb secondary | .flatpak primary, .deb as secondary/deprecated. | |

**Note:** User first selected "Both every release" then later selected "Artifact only" for .deb (workflow artifact only, not release asset). The later answer prevails in CONTEXT.md (D-01, D-22): `.flatpak` is the sole release asset; `.deb` is a workflow artifact for CI internal consumption only.

| Option | Description | Selected |
|--------|-------------|----------|
| One transition release | One release with both, then Phase 16 removes .deb. Fastest. | |
| 2-3 releases | More cautious. Fallback available if flatpak has issues. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Add release notes | Brief guidance block: .flatpak is recommended for Steam Deck. | ✓ |
| Filenames only | No annotations. Users figure it out. | |

---

## OSTree Cache Config

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest hash | Key on manifest hash only. | |
| Manifest + runtime version | Key on manifest path + runtime version. More robust. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Cache build deps too | Cache Rust target/, pnpm store, cargo registry. Dramatically faster. | ✓ |
| OSTree cache only | Only cache runtime. Build from scratch each time. | |

| Option | Description | Selected |
|--------|-------------|----------|
| actions/cache@v4 | Generic cache for Rust + pnpm. Industry standard. | ✓ |
| Swatinem/rust-cache + actions/cache | Specialized Rust caching. Handles sccache, workspaces. | |
| Rely on setup-node cache only | Only pnpm cache via setup-node. No Rust caching. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Full: cargo + target + pnpm | Cache registry + target/ + pnpm store. Target/ is 1-2 GB but saves 5-10 min. | ✓ |
| Registry + pnpm only, no target | Smaller cache, but incremental builds still download and recompile. | |

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions cache | 10 GB limit per repo, 7-day eviction. Works for OSTree + build caches. | ✓ |
| Handled by action | flatpak-github-actions handles internally. | |

**Note:** These are complementary — the flatpak-github-actions action uses GitHub Actions cache internally when `cache: true` is set.

---

## the agent's Discretion

- Exact caching key format and invalidation strategy for `actions/cache@v4`.
- Whether to use `github.ref_name` or extract version from `Cargo.toml`.
- Exact `action-gh-release` configuration (glob pattern, token).
- Whether to add a `needs: build-x64` skip condition.
- Placement of `git diff --exit-code` check.

## Conflict Notes

**D-01 vs D-21 resolution:** User initially selected "Separate job per artifact — build-x64 uploads .deb, build-flatpak-x64 uploads .flatpak" in the gray area selection and then "Both every release" for artifact retention. Later, when asked specifically about .deb upload channels, user selected "Artifact only" (workflow artifact, not release asset). The later answer prevails: `.flatpak` is the sole release asset; `.deb` is CI-internal only. The "separate job" concept still holds structurally (different jobs handle different artifacts) but only `build-flatpak-x64` uploads to GitHub Releases.
