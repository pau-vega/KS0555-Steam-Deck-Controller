# Validation Report — YYYY-MM-DD

> Copy `flatpak/VALIDATION-CHECKLIST.md` and fill it out, or use this template as a standalone dated report.
> Save as: `flatpak/validation-reports/YYYY-MM-DD-REPORT.md`

## Report Metadata

- **Date:** YYYY-MM-DD
- **Tester:** **\_**
- **Steam Deck model:** **\_** (LCD / OLED)
- **SteamOS version:** **\_**
- **Flatpak version:** **\_**
- **Build tested:** commit **\_** / version **\_**
- **BT24 robot:** present / not present
- **Overall result:** PASS / FAIL

## Test Results Summary

| Section                  | Requirement         | Result       | Notes |
| ------------------------ | ------------------- | ------------ | ----- |
| 1. Installation          | DECK-01             | PASS/FAIL    |       |
| 2. Desktop BLE + Gamepad | DECK-02             | PASS/FAIL    |       |
| 3. Non-Steam Game        | DECK-03             | PASS/FAIL    |       |
| 4. Gaming Mode           | DECK-04             | PASS/FAIL    |       |
| 5. Steam Input           | D-12/D-13           | N/A (tested) |       |
| 6. Round-Trip            | D-14                | PASS/FAIL    |       |
| 7. Offline Mode          | (D-05)              | PASS/FAIL    |       |
| 8. UI Validation         | (D-05)              | PASS/FAIL    |       |
| 9. Edge Cases            | D-15/D-16/D-17/D-18 | See below    |       |
| 10. Overall              | VAL-09              | PASS/FAIL    |       |

## Detailed Results

_(Copy the full checklist from VALIDATION-CHECKLIST.md and fill in each `[ ]` with `[x]` for tested, annotate PASS/FAIL.)_

## Gaming Mode Notes

- Black screen encountered? (Yes / No)
- Workaround needed? (Yes / No) — If yes, which: **\_**
- Latency compared to Desktop Mode: same / worse / much worse

## Steam Input Recommendation

- Working template: **\_**
- Notes: **\_**

## Key Log Snippets

### BLE connect (from app log)

```
[PASTE relevant log lines showing BLE connection]
```

### Gamepad direction events (from app log)

```
[PASTE relevant log lines showing gamepad-direction events]
```

### Env dump (sandbox verification)

```
[PASTE output of `flatpak run --command=env com.ks0555.robotcontroller`]
```

Verify `WEBKIT_DISABLE_COMPOSITING_MODE=1` is present: (Yes / No)

## Issues Found

| #   | Description | Severity | Resolution |
| --- | ----------- | -------- | ---------- |
| 1   |             |          |            |
| 2   |             |          |            |

## Sign-off

- [ ] All required sections completed
- [ ] Log artifacts saved to `flatpak/validation-logs/YYYY-MM-DD-*.log`
- [ ] This report saved to `flatpak/validation-reports/YYYY-MM-DD-REPORT.md`

---

_Report generated: YYYY-MM-DD_
_Checklist version: from `flatpak/VALIDATION-CHECKLIST.md` commit **\_**_
