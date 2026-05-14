#!/usr/bin/env bash
# docker-build.sh — Build Flatpak bundle inside Docker (mirrors CI flatpak-builder step)
# Usage: docker-build.sh <path-to-deb>
#   <path-to-deb> — path to the .deb produced by 'cargo tauri build --bundles deb'
#
# Uses the same container image as CI: ghcr.io/flathub-infra/flatpak-github-actions:gnome-48
# Works on macOS (Docker Desktop) and Linux (Docker Engine) without flatpak-builder installed.
set -euo pipefail

# === Usage ===

if [ $# -ne 1 ]; then
    echo "Usage: docker-build.sh <path-to-deb>"
    echo "  <path-to-deb> — path to the .deb produced by 'cargo tauri build --bundles deb'"
    echo ""
    echo "  Uses Docker to run flatpak-builder (works on macOS and Linux)."
    echo "  Mirror of CI's flatpak-builder step — same container image."
    exit 1
fi

DEB_PATH="$1"

# === Deb validation ===

if [ ! -f "$DEB_PATH" ]; then
    echo "Error: deb file not found at '$DEB_PATH'"
    echo "Run 'cargo tauri build --bundles deb' from apps/frontend/src-tauri/ first."
    exit 1
fi

if [ ! -s "$DEB_PATH" ]; then
    echo "Error: deb file at '$DEB_PATH' is empty"
    exit 1
fi

# === Host arch check (aarch64 cannot run amd64 flatpak-builder) ===
# Bubblewrap requires user namespaces (CLONE_NEWUSER). Neither Rosetta nor QEMU translates
# this syscall correctly when emulating amd64 on aarch64:
#   - Rosetta: prctl(PR_SET_SECCOMP) returns EINVAL
#   - QEMU:    unshare(CLONE_NEWUSER) returns EINVAL
# Refuse early with actionable guidance.

HOST_ARCH="$(uname -m)"
if [ "$HOST_ARCH" = "arm64" ] || [ "$HOST_ARCH" = "aarch64" ]; then
    echo "✗ Refusing to run on $HOST_ARCH host."
    echo "  Docker amd64 emulation on aarch64 hosts cannot run flatpak-builder."
    echo "  Root cause: bubblewrap needs user namespaces (CLONE_NEWUSER); neither Rosetta"
    echo "  nor QEMU translates that syscall correctly when emulating amd64 on aarch64."
    echo "  Tested: Rosetta fails on prctl(PR_SET_SECCOMP); QEMU fails on unshare(CLONE_NEWUSER)."
    echo "  Workarounds:"
    echo "    - Push a tag and let GitHub Actions build the flatpak (.github/workflows/build.yml)"
    echo "    - Run on a native x86_64 Linux host (or via 'just flatpak-build')"
    echo "    - SSH to a Steam Deck and run 'just flatpak-build' there"
    exit 1
fi

# === Platform check (Docker availability) ===

if ! command -v docker &>/dev/null; then
    echo "Error: 'docker' command not found."
    echo "Install Docker Desktop (macOS) or Docker Engine (Linux) and try again."
    exit 1
fi

echo "→ Docker version: $(docker --version)"

# Check if Docker daemon is running
if ! docker info &>/dev/null; then
    echo "Error: Docker daemon is not running."
    echo "Start Docker Desktop (macOS) or Docker Engine (Linux) and try again."
    exit 1
fi

# === Resolve paths ===

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEB_COPY="${SCRIPT_DIR}/robot-controller.deb"

# === Copy deb into flatpak/ directory ===
# Manifest references 'robot-controller.deb' as a relative path source,
# so the deb must be in the same directory as the manifest during build.
cp "$DEB_PATH" "$DEB_COPY"
echo "→ Copied deb to $DEB_COPY"

# === Docker run: flatpak-builder ===

echo ""
echo "→ Pulling container image (first run may take a few minutes)..."
echo "   Image: ghcr.io/flathub-infra/flatpak-github-actions:gnome-48"
# Target = Steam Deck (x86_64). Force linux/amd64 so Apple Silicon hosts don't produce aarch64 artifacts.
docker pull --platform linux/amd64 ghcr.io/flathub-infra/flatpak-github-actions:gnome-48

echo ""
echo "→ Running flatpak-builder inside Docker..."

docker run --rm \
    --platform linux/amd64 \
    --privileged \
    -v "${REPO_ROOT}:/workspace" \
    -w /workspace \
    ghcr.io/flathub-infra/flatpak-github-actions:gnome-48 \
    /bin/bash -c '
set -euo pipefail

echo "→ Configuring Flathub remote..."
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

echo "→ Installing runtime + SDK (one-time download ~300 MB)..."
flatpak install --user -y --noninteractive flathub org.gnome.Platform//48 org.gnome.Sdk//48

echo "→ Running flatpak-builder..."
flatpak-builder --user --install --force-clean --disable-rofiles-fuse build-dir flatpak/com.ks0555.robotcontroller.yaml

echo "→ Creating Flatpak bundle..."
mkdir -p repo
flatpak build-export repo build-dir
flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller

echo "✓ Flatpak bundle created: RobotController-x86_64.flatpak"
'

# === Post-build cleanup ===

echo ""
echo "→ Cleaning up build artifacts..."
rm -rf "${SCRIPT_DIR}/build-dir" "${SCRIPT_DIR}/repo" "${SCRIPT_DIR}/.flatpak-builder"
rm -f "$DEB_COPY"
echo "  ✓ Build artifacts cleaned up"

# === Report ===

echo ""
echo "✓ Flatpak build complete"
echo "  Bundle: RobotController-x86_64.flatpak"
echo "  Install: flatpak install --user RobotController-x86_64.flatpak"
echo "  Run:     flatpak run com.ks0555.robotcontroller"
