# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Tauri Migration

**Shipped:** 2026-05-12
**Phases:** 5 | **Plans:** 12 | **Sessions:** multiple

### What Was Built
- Tauri v2 desktop shell replacing browser-based React+Vite (Phases 6, 9)
- BLE communication via btleplug crate with managed state, scan timeout, disconnect detection (Phase 7)
- Gamepad input via gilrs background thread with deadzone, direction-change guard, Steam Deck preference (Phase 8)
- CI pipeline building AppImage on tag push (Phase 10)
- All hook interfaces preserved — app.tsx unchanged

### What Worked
- Rust + Tauri proved reliable for native BLE/gamepad — immediate fix for broken Web APIs
- Thread-safe state management pattern (Arc<Mutex<>> + cloned AppHandle) worked without Send trait issues
- Direction-change guard prevented Tauri event rate limiting crashes

### What Was Inefficient
- AppImage chosen as initial target but later replaced by Flatpak — wasted effort
- Custom tauri-cli fork for AppImage created maintenance burden
- No early CI validation of build pipeline on target platform

### Patterns Established
- `Arc<Mutex<Option<Peripheral>>>` for thread-safe BLE state across Tauri commands
- Direction-change guard pattern for event emission prevention
- app.tsx as locked file — CI-enforced `git diff --exit-code`

### Key Lessons
1. Choose distribution format early — AppImage was a throwaway decision
2. CI should run on target platform from day one, not after all phases complete
3. Thread safety with Tauri AppHandle is straightforward with cloned handles

---

## Milestone: v2.1 — Flatpak Packaging

**Shipped:** 2026-05-12
**Phases:** 9 | **Plans:** 15 | **Sessions:** multiple

### What Was Built
- Flatpak packaging pipeline: deb → flatpak-builder → single-file `.flatpak` (Phases 11-12)
- Sandbox permissions for BLE (org.bluez D-Bus) + gamepad (evdev) (Phase 13)
- CI migration: AppImage → Flatpak, single-job pipeline (Phases 15-16)
- Documentation rewrite: README, ARCHITECTURE.md, STEAM_DECK.md (Phases 16, 18)
- End-to-end CI validation: 3.6 MB .deb + 2.4 MB .flatpak produced (Phase 19)

### What Worked
- Phase 17-19 closure phases effectively fixed gaps identified by milestone audit
- CI pipeline validated end-to-end on GitHub Actions runner
- in_flatpak() D-Bus gate solved the sandbox compatibility issue cleanly
- Closure phase numbering (17-19) after initial 6-milestone scope allowed gap-fixing without re-planning the entire milestone

### What Was Inefficient
- Audit gaps found mid-milestone (no VERIFICATION.md for 3 phases, stale docs, build never executed) required 3 extra phases to close
- Requirements traceability table in REQUIREMENTS.md not updated as phases completed — became stale
- VAL-06, VAL-07, VAL-09 deferred to hardware testing — no real-Deck validation executed
- metainfo.xml initially had wrong GitHub repo owner (caught by audit, not review)

### Patterns Established
- Closure phases (decimal or added after milestone scope) for gap-fixing post-audit
- VERIFICATION.md per phase with concrete commands (not hand-wavy descriptions)
- Anti-feature checklist as comment block in manifest
- Stale Tauri cache cleanup step for CI cache path drift

### Key Lessons
1. Phase summaries should update REQUIREMENTS.md traceability table as they complete — don't wait
2. Hardware-dependent validation (BLE, gamepad, Steam Deck) should be explicitly flagged as deferred from requirement definition, not discovered at audit
3. VERIFICATION.md should be created alongside SUMMARY.md, not retroactively
4. CI validation should happen before closing the milestone — Phase 19 proved the build pipeline actually works

### Cost Observations
- Phases 11-16 (core work): ~4 days
- Phases 17-19 (gap closure): ~3 days
- Notable: Audit-to-fix cycle took nearly as long as the original work due to deferred verification

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v2.0 | 5 | First Rust + Tauri milestone, established patterns |
| v2.1 | 9 | Added audit-driven gap closure phases (17-19) |

### Cumulative Quality

| Milestone | Phases | Plans | Zero-Dep Additions |
|-----------|--------|-------|-------------------|
| v2.0 | 5 | 12 | btleplug, gilrs, tokio, serde |
| v2.1 | 9 | 15 | flatpak-builder, actions/cache |

### Top Lessons (Verified Across Milestones)

1. **Verify early, verify often** — Both milestones had gaps that were only caught at audit time. Phase-level VERIFICATION.md should be a standard deliverable.
2. **Distribution format is a dependency** — Choosing AppImage first then migrating to Flatpak created rework. Lock the distribution target before Phase 1.
3. **Closure phases work** — Adding Phases 17-19 after the audit fixed real gaps. The pattern of "audit → insert closure phases → execute" is worth standardizing.
