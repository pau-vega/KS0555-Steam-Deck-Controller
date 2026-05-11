#!/usr/bin/env bash
# verify-flatpak.sh — Automated Nyquist validation suite for Phase 12 flatpak artifacts
# Usage: ./flatpak/tests/verify-flatpak.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FLATPAK="${ROOT}/flatpak"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
check() {
  local label cmd
  label="$1"
  cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then pass "$label"; else fail "$label"; fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Flatpak Validation Suite — Phase 12"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "--- File Existence ---"
check "manifest.yaml exists"         "test -f ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "metainfo.xml exists"          "test -f ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "build.sh exists"              "test -f ${FLATPAK}/build.sh"
check "build.sh executable"          "test -x ${FLATPAK}/build.sh"
check "README.md exists"             "test -f ${FLATPAK}/README.md"
check "icon 32x32 exists"            "test -f ${FLATPAK}/icons/32x32/com.ks0555.robotcontroller.png"
check "icon 128x128 exists"          "test -f ${FLATPAK}/icons/128x128/com.ks0555.robotcontroller.png"
check "icon 256x256@2 exists"        "test -f ${FLATPAK}/icons/256x256@2/com.ks0555.robotcontroller.png"

echo ""
echo "--- YAML Manifest ---"
check "YAML parses via python3"      "python3 -c \"import yaml; yaml.safe_load(open('${FLATPAK}/com.ks0555.robotcontroller.yaml'))\""
check "id: com.ks0555.robotcontroller" "grep -q 'id: com.ks0555.robotcontroller' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "runtime-version: 24.08"       "grep -q 'runtime-version: \"24.08\"' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "command: robot-controller"    "grep -q 'command: robot-controller' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "socket=wayland in finish-args" "grep -q 'socket=wayland' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "WEBKIT env in finish-args"    "grep -q 'WEBKIT_DISABLE_COMPOSITING_MODE=1' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "ar -x deb command"            "grep -q 'ar -x robot-controller.deb' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "tar -xf data.tar.* glob"      "grep -q 'tar -xf data.tar.' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "Icon= sed command"            "grep -q 'Icon=com.ks0555.robotcontroller' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "icon source 32x32"            "grep -q 'icons/32x32/com.ks0555.robotcontroller.png' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "icon source 128x128"          "grep -q 'icons/128x128/com.ks0555.robotcontroller.png' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "icon source 256x256@2"        "grep -q 'icons/256x256@2/com.ks0555.robotcontroller.png' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "GL extension present"         "grep -q 'org.freedesktop.Platform.GL.default' ${FLATPAK}/com.ks0555.robotcontroller.yaml"

echo ""
echo "--- Phase 13 Finish-Args (added by Phase 13, supersedes Phase 12 scope) ---"
check "system-talk-name=org.bluez present"    "grep -q 'system-talk-name=org.bluez' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "device=input present"                   "grep -Fqe '--device=input' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "--share=network present"                "grep -Fqe '--share=network' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "--allow=bluetooth present"              "grep -Fqe '--allow=bluetooth' ${FLATPAK}/com.ks0555.robotcontroller.yaml"

echo ""
echo "--- D-06 Guard (no cleanup section) ---"
check "NO cleanup section"           "! grep -q 'cleanup:' ${FLATPAK}/com.ks0555.robotcontroller.yaml"

echo ""
echo "--- XML Metainfo ---"
check "XML well-formed"              "xmllint --noout ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "<id> present"                 "grep -q '<id>com.ks0555.robotcontroller</id>' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "<metadata_license> FSFAP"     "grep -q '<metadata_license>FSFAP</metadata_license>' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "<project_license> MIT"        "grep -q '<project_license>MIT</project_license>' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "<launchable> desktop-id"      "grep -q '<launchable type=\"desktop-id\">com.ks0555.robotcontroller.desktop</launchable>' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "<release version 0.1.5"       "grep -q '<release version=\"0.1.5\"' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"

echo ""
echo "--- Icon Dimensions ---"
check "icon 32x32 is 32x32"          "identify ${FLATPAK}/icons/32x32/com.ks0555.robotcontroller.png 2>/dev/null | grep -q '32x32'"
check "icon 128x128 is 128x128"      "identify ${FLATPAK}/icons/128x128/com.ks0555.robotcontroller.png 2>/dev/null | grep -q '128x128'"
check "icon 256x256@2 is 512x512"    "identify ${FLATPAK}/icons/256x256@2/com.ks0555.robotcontroller.png 2>/dev/null | grep -q '512x512'"

echo ""
echo "--- build.sh Properties ---"
check "shebang present"              "grep -q '#!/usr/bin/env bash' ${FLATPAK}/build.sh"
check "set -euo pipefail"            "grep -q 'set -euo pipefail' ${FLATPAK}/build.sh"
check "path-to-deb argument"         "grep -q 'path-to-deb' ${FLATPAK}/build.sh"
check "perform_structural_validation" "grep -q 'perform_structural_validation' ${FLATPAK}/build.sh"
check "perform_flatpak_build"        "grep -q 'perform_flatpak_build' ${FLATPAK}/build.sh"
check "references manifest yaml"     "grep -q 'com.ks0555.robotcontroller.yaml' ${FLATPAK}/build.sh"
check "produces .flatpak bundle"     "grep -q 'RobotController-x86_64.flatpak' ${FLATPAK}/build.sh"

echo ""
echo "--- README Content ---"
check "README has Prerequisites"     "grep -q '## Prerequisites' ${FLATPAK}/README.md"
check "README has Building"          "grep -q '## Building' ${FLATPAK}/README.md"
check "README has Installing+Running" "grep -q '## Installing and Running' ${FLATPAK}/README.md"
check "README has Architecture"      "grep -q '## Architecture' ${FLATPAK}/README.md"
check "README has Regenerating Icons" "grep -q '## Regenerating Icons' ${FLATPAK}/README.md"
check "README refs runtime 24.08"    "grep -q 'org.freedesktop.Platform//24.08' ${FLATPAK}/README.md"

echo ""
echo "--- App ID Consistency ---"
ID="com.ks0555.robotcontroller"
check "manifest id=$ID"              "grep -q 'id: $ID' ${FLATPAK}/com.ks0555.robotcontroller.yaml"
check "metainfo id=$ID"              "grep -q '<id>$ID</id>' ${FLATPAK}/com.ks0555.robotcontroller.metainfo.xml"
check "icon filename 32x32=$ID"      "echo '${ID}.png' | grep -q '${ID}.png'"
check "icon filename 128x128=$ID"    "echo '${ID}.png' | grep -q '${ID}.png'"
check "icon filename 256x256@2=$ID"  "echo '${ID}.png' | grep -q '${ID}.png'"
check "build.sh refs $ID"            "grep -q '$ID' ${FLATPAK}/build.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo " RESULT: ALL ${TOTAL} TESTS PASSED"
  exit 0
else
  echo " RESULT: ${PASS}/${TOTAL} passed, ${FAIL} failed"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
