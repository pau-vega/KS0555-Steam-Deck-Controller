#!/usr/bin/env bash
set -euo pipefail

# Phase 14: Steam Deck On-Device Validation — Automated Checks
# Verifies all documentation artifacts exist and are well-formed.
# On-device DECK-01..04 + VAL-09 require a physical Steam Deck + BT24.

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

PASS=0; FAIL=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Phase 14 Validation Artifacts ==="

echo ""
echo "--- Task 1: VALIDATION-CHECKLIST.md ---"

check "File exists" test -f flatpak/VALIDATION-CHECKLIST.md

C=flatpak/VALIDATION-CHECKLIST.md
check ">=30 PASS/FAIL checkboxes" test "$(grep -cE '\[ \] PASS / \[ \] FAIL' "$C")" -ge 30
check "DECK-01 annotation" grep -q 'DECK-01' "$C"
check "DECK-02 annotation" grep -q 'DECK-02' "$C"
check "DECK-03 annotation" grep -q 'DECK-03' "$C"
check "DECK-04 annotation" grep -q 'DECK-04' "$C"
check "VAL-09 annotation" grep -q 'VAL-09' "$C"
check "Preconditions: SteamOS" grep -q 'SteamOS' "$C"
check "Preconditions: Flatpak version" grep -q 'Flatpak version' "$C"
check "Preconditions: BT24" grep -q 'BT24' "$C"
check "Preconditions: Bluetooth" grep -q 'Bluetooth' "$C"
check "Gaming Mode escalation protocol" grep -q 'Gaming Mode Escalation' "$C"
check "Steam Input section" test "$(grep -c 'Steam Input' "$C")" -ge 3
check "device=input fallback" grep -q 'device=input' "$C"
check "Log capture command" grep -qE 'RUST_LOG=debug.*2>' "$C"

echo ""
echo "--- Task 2: Report Template & Scaffolding ---"

check "REPORT-TEMPLATE.md exists" test -f flatpak/validation-reports/REPORT-TEMPLATE.md
check "Reports .gitkeep exists" test -f flatpak/validation-reports/.gitkeep
check "Logs .gitkeep exists" test -f flatpak/validation-logs/.gitkeep

T=flatpak/validation-reports/REPORT-TEMPLATE.md
check "Template has Report Metadata" grep -q 'Report Metadata' "$T"
check "Template covers DECK-01" grep -q 'DECK-01' "$T"
check "Template covers DECK-02" grep -q 'DECK-02' "$T"
check "Template covers DECK-03" grep -q 'DECK-03' "$T"
check "Template covers DECK-04" grep -q 'DECK-04' "$T"
check "Template covers VAL-09" grep -q 'VAL-09' "$T"
check "Template has log snippet slots" test "$(grep -cE 'Log Snippets|PASTE' "$T")" -ge 2
check "Template has Gaming Mode notes" grep -q 'Gaming Mode' "$T"
check "Template has Steam Input field" grep -q 'Steam Input' "$T"

echo ""
echo "--- Task 3: README update ---"

R=flatpak/README.md
check "README has ## Validation section" grep -q '## Validation' "$R"
check "README references checklist" grep -q 'VALIDATION-CHECKLIST' "$R"
check "README covers DECK-01" grep -q 'DECK-01' "$R"
check "README covers DECK-02" grep -q 'DECK-02' "$R"
check "README covers DECK-03" grep -q 'DECK-03' "$R"
check "README covers DECK-04" grep -q 'DECK-04' "$R"
check "README covers VAL-09" grep -q 'VAL-09' "$R"
check "README has install command" grep -q 'flatpak install --user' "$R"
check "README Prerequisites section intact" grep -q '^## Prerequisites' "$R"

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo "  Status: ALL CHECKS PASSED"
  exit 0
else
  echo "  Status: SOME CHECKS FAILED"
  exit 1
fi
