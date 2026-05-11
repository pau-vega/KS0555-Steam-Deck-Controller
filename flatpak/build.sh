#!/usr/bin/env bash
# build.sh — Build the Robot Controller Flatpak bundle
# Usage: build.sh <path-to-deb>
#   <path-to-deb> — absolute or relative path to the .deb from Tauri build
#   e.g.: build.sh apps/frontend/src-tauri/target/release/bundle/deb/robot-controller_0.1.5_amd64.deb
set -euo pipefail

# === Functions ===

perform_structural_validation() {
    echo "→ Checking manifest YAML syntax..."
    if command -v python3 &>/dev/null; then
        python3 -c "import yaml; yaml.safe_load(open('${MANIFEST}'))" \
            && echo "  ✓ Manifest YAML is valid" \
            || { echo "  ✗ Manifest YAML parse error"; exit 1; }
    else
        echo "  ⚠ python3 not found — skipping YAML validation"
    fi

    echo "→ Checking metainfo XML well-formedness..."
    if command -v xmllint &>/dev/null; then
        xmllint --noout "${SCRIPT_DIR}/com.ks0555.robotcontroller.metainfo.xml" \
            && echo "  ✓ Metainfo XML is well-formed" \
            || { echo "  ✗ Metainfo XML parse error"; exit 1; }
    else
        echo "  ⚠ xmllint not found — skipping XML validation"
    fi

    echo "→ Checking icon files exist..."
    for icon in \
        "${SCRIPT_DIR}/icons/32x32/com.ks0555.robotcontroller.png" \
        "${SCRIPT_DIR}/icons/128x128/com.ks0555.robotcontroller.png" \
        "${SCRIPT_DIR}/icons/256x256@2/com.ks0555.robotcontroller.png"; do
        if [ -f "$icon" ]; then
            echo "  ✓ $(basename "$(dirname "$icon")")/$(basename "$icon") exists"
        else
            echo "  ✗ Missing: $icon"
            exit 1
        fi
    done

    echo "→ Checking metainfo file exists..."
    if [ -f "${SCRIPT_DIR}/com.ks0555.robotcontroller.metainfo.xml" ]; then
        echo "  ✓ com.ks0555.robotcontroller.metainfo.xml exists"
    else
        echo "  ✗ Missing metainfo.xml"
        exit 1
    fi

    echo ""
    echo "✓ macOS structural validation passed"
    echo "  To build the Flatpak, run this script on a Linux machine"
    echo "  or on the Steam Deck with flatpak-builder installed."
}

perform_flatpak_build() {
    echo "→ Cleaning previous build artifacts..."
    rm -rf "$BUILD_DIR" "$REPO_DIR"

    echo "→ Running flatpak-builder..."
    flatpak-builder \
        --user \
        --install \
        --force-clean \
        "$BUILD_DIR" \
        "$MANIFEST"

    echo "→ Creating flatpak-builder repo..."
    mkdir -p "$REPO_DIR"
    flatpak build-export "$REPO_DIR" "$BUILD_DIR"

    echo "→ Building single-file .flatpak bundle..."
    flatpak build-bundle \
        "$REPO_DIR" \
        "${SCRIPT_DIR}/../RobotController-x86_64.flatpak" \
        com.ks0555.robotcontroller

    echo ""
    echo "✓ Flatpak build complete"
    echo "  Bundle: RobotController-x86_64.flatpak"
    echo "  Install: flatpak install --user RobotController-x86_64.flatpak"
    echo "  Run:     flatpak run com.ks0555.robotcontroller"
}

# === Main ===

# Argument validation
if [ $# -ne 1 ]; then
    echo "Usage: build.sh <path-to-deb>"
    echo "  <path-to-deb> — path to the .deb produced by 'cargo tauri build --bundles deb'"
    exit 1
fi

DEB_PATH="$1"

if [ ! -f "$DEB_PATH" ]; then
    echo "Error: deb file not found at '$DEB_PATH'"
    echo "Run 'cargo tauri build --bundles deb' from apps/frontend/src-tauri/ first."
    exit 1
fi

# Resolve to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="${SCRIPT_DIR}/com.ks0555.robotcontroller.yaml"
BUILD_DIR="${SCRIPT_DIR}/build-dir"
REPO_DIR="${SCRIPT_DIR}/repo"
DEB_COPY="${SCRIPT_DIR}/robot-controller.deb"

# Copy deb into flatpak/ directory
# Manifest references 'robot-controller.deb' as a relative path source,
# so the deb must be in the same directory as the manifest during build.
cp "$DEB_PATH" "$DEB_COPY"
echo "→ Copied deb to $DEB_COPY"

# Platform detection
case "$(uname -s)" in
    Darwin)
        echo "→ macOS detected — running structural validation only (D-16)"
        perform_structural_validation
        ;;
    Linux)
        echo "→ Linux detected — running flatpak-builder"
        perform_flatpak_build
        ;;
    *)
        echo "Error: unsupported platform '$(uname -s)'"
        exit 1
        ;;
esac
