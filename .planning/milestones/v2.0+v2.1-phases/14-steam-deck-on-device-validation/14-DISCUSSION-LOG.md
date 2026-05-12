# Phase 14: Steam Deck On-Device Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 14-Steam Deck On-Device Validation
**Areas discussed:** Validation checklist depth, Log artifact scope + method, Gaming Mode protocol, Failure handling + fallbacks

---

## Validation Checklist Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Formal checklist | Structured pass/fail per step with req-ID annotations | ✓ |
| Ad-hoc findings doc | Less structure, flexibility | |
| Reusable checklist | Lives in flatpak/ for future releases | ✓ |
| One-time only | Produced ad-hoc for this phase | |
| Explicit preconditions | Document Flatpak version, SteamOS, BT24 on, Bluetooth on | ✓ |
| Assume tester knows | No precondition documentation | |
| Pass/Fail | Simple binary per step | ✓ |
| Severity scale | pass/warn/fail/blocking | |
| BLE reconnect test | Yes, include disconnect/reconnect robot | ✓ |
| No reconnect test | Focus on first-connection | |
| Qualitative latency | Note immediate/slight lag/noticeable delay | ✓ |
| Functional only | Whether robot moves, not speed | |
| Rapid direction test | Yes, test F→B→L→R rapid sequence | ✓ |
| No rapid test | Single commands only | |
| Explicit stop test | Yes, send S after movement | ✓ |
| Implicit stop only | Robot stops when idle | |
| Separate report artifact | Dated report in flatpak/validation-reports/ | ✓ |
| Inline only | Fill results in CHECKLIST.md | |
| Full UI validation | StatusBar states, ControlPad buttons | ✓ |
| Minimal UI check | Window opens without error | |
| Offline test | Yes, test with no BT24 nearby | ✓ |
| No offline test | Always test with robot | |
| App-only | Focus on app functionality | ✓ |
| Include hardware | Deck hardware checks | |
| Req-ID annotations | Each step annotated with req-ID | ✓ |
| No annotations | Just describe the step | |

**User's choice:** Formal reusable checklist with explicit preconditions, pass/fail grading, req-ID annotations, full UI validation, offline test, rapid input test, explicit stop test, BLE reconnect test, qualitative latency, separate dated report artifact.

---

## Log Artifact Scope + Method

| Option | Description | Selected |
|--------|-------------|----------|
| App-level only | RUST_LOG=debug, app stdout/stderr, BLE/gamepad path | ✓ |
| Full system capture | App + dbus-monitor + journalctl + gamepad counters | |
| Redirected stderr | flatpak run with stderr redirect to file | ✓ |
| Capture script | Wrapper script with timestamps and labels | |
| Snippets in report | Key log excerpts in the report | ✓ |
| Full logs in repo | Raw logs committed alongside report | |
| Verify WEBKIT env var | Yes, dump env inside sandbox | ✓ |
| Implicit validation | No black screen = it worked | |

**User's choice:** App-level only, redirected stderr, log snippets in report, verify WEBKIT env var.

---

## Gaming Mode Protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Structured escalation | Add Non-Steam → Gaming → launch → black screen workarounds → debug | ✓ |
| Quick launch | Launch, debug if needed | |
| Both Steam Input modes | Default + gamepad-pass-through config | ✓ |
| Default only | Test with current config only | |
| Always document template | Proactive Steam Input controller template docs | ✓ |
| Only if needed | Document only if default breaks | |
| Full round-trip | Desktop → Gaming → Desktop | ✓ |
| Gaming only | Focus on Gaming Mode | |

**User's choice:** Structured escalation, both Steam Input modes, always document template, full round-trip.

---

## Failure Handling + Fallbacks

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive fallback test | Test --device=input, if fail test --device=all, document | ✓ |
| Document only | Note --device=all as fallback, test primary only | |
| BLE Gaming failure: document | Known limitation with troubleshooting note | ✓ |
| BLE Gaming failure: blocking | Fix before shipping | |
| Install failure: verbose retry | Retry with --verbose, capture error, include fix | ✓ |
| Install failure: blocker | Stop, note failure | |
| Black screen: try workarounds | Double env, fallback-x11-only, document working combo | ✓ |
| Black screen: blocker | Must resolve before release | |

**User's choice:** Proactive --device=all fallback test, BLE Gaming failure documented as limitation (not blocking), install failure gets verbose retry, black screen gets workaround attempts documented.

---

## the agent's Discretion

- Exact format and indentation of VALIDATION-CHECKLIST.md
- Exact structure of the validation report template
- Steam Input template name and documentation phrasing
- Shell commands for log capture in the checklist

## Deferred Ideas

None.
