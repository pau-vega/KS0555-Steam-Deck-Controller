#!/bin/bash
# One-shot installer for Robot Controller on Steam Deck.
#
# Usage from Konsole on the Deck:
#   curl -fsSL https://raw.githubusercontent.com/pau-vega/KS0555-Steam-Deck-Controller-2/main/install-on-steamdeck.sh | bash
#
# What it does:
#   1. Detects architecture (Steam Deck = x86_64; aarch64 supported as fallback).
#   2. Downloads the latest signed AppImage from GitHub Releases.
#   3. Installs to ~/Applications/RobotController.AppImage.
#   4. Registers a .desktop entry so it appears in the KDE app menu and in
#      Steam's "Add a Non-Steam Game" picker.
#   5. Prints the one manual step left: adding it to Steam.
#
# Re-run anytime to upgrade — overwrites the existing AppImage in place.

set -euo pipefail

REPO="pau-vega/KS0555-Steam-Deck-Controller-2"
APP_NAME="RobotController"
DISPLAY_NAME="Robot Controller"
INSTALL_DIR="${HOME}/Applications"
APPIMAGE_PATH="${INSTALL_DIR}/${APP_NAME}.AppImage"
DESKTOP_DIR="${HOME}/.local/share/applications"
DESKTOP_FILE="${DESKTOP_DIR}/${APP_NAME}.desktop"
ICON_DIR="${HOME}/.local/share/icons/hicolor/512x512/apps"
ICON_PATH="${ICON_DIR}/${APP_NAME}.png"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}!!${NC} $*" >&2; }
fail() { echo -e "${RED}xx${NC} $*" >&2; exit 1; }

# --- Detect architecture ----------------------------------------------------
ARCH=$(uname -m)
case "${ARCH}" in
  x86_64)  ASSET_SUFFIX="x86_64"  ;;
  aarch64) ASSET_SUFFIX="aarch64" ;;
  *) fail "Unsupported architecture: ${ARCH}. Steam Deck is x86_64." ;;
esac
step "Detected architecture: ${ARCH}"

# --- Sanity-check tools -----------------------------------------------------
for cmd in curl chmod mkdir; do
  command -v "${cmd}" >/dev/null 2>&1 || fail "Missing required tool: ${cmd}"
done

# --- Resolve latest release asset URL ---------------------------------------
ASSET_URL="https://github.com/${REPO}/releases/latest/download/${APP_NAME}-${ASSET_SUFFIX}.AppImage"
step "Latest release: ${ASSET_URL}"

# --- Download AppImage ------------------------------------------------------
mkdir -p "${INSTALL_DIR}"
step "Downloading to ${APPIMAGE_PATH}"
TMP=$(mktemp)
trap 'rm -f "${TMP}"' EXIT
if ! curl -fL --progress-bar -o "${TMP}" "${ASSET_URL}"; then
  fail "Download failed. The latest release may not have an AppImage for ${ASSET_SUFFIX} yet — check ${REPO}/releases."
fi
mv "${TMP}" "${APPIMAGE_PATH}"
trap - EXIT
chmod +x "${APPIMAGE_PATH}"
step "Installed AppImage."

# --- Extract bundled icon for the menu entry --------------------------------
mkdir -p "${ICON_DIR}"
EXTRACT_DIR=$(mktemp -d)
trap 'rm -rf "${EXTRACT_DIR}"' EXIT
if (cd "${EXTRACT_DIR}" && "${APPIMAGE_PATH}" --appimage-extract '*.png' >/dev/null 2>&1); then
  ICON_SRC=$(find "${EXTRACT_DIR}/squashfs-root" -maxdepth 2 -name '*.png' | head -1 || true)
  if [ -n "${ICON_SRC}" ] && [ -f "${ICON_SRC}" ]; then
    cp "${ICON_SRC}" "${ICON_PATH}"
    step "Icon registered at ${ICON_PATH}"
  else
    warn "No icon found inside AppImage; menu entry will use generic icon."
    ICON_PATH=""
  fi
else
  warn "Could not extract icon from AppImage; menu entry will use generic icon."
  ICON_PATH=""
fi
rm -rf "${EXTRACT_DIR}"
trap - EXIT

# --- Ensure AppImages can run without FUSE (SteamOS lacks libfuse2) -------
export APPIMAGE_EXTRACT_AND_RUN=1

# --- Write .desktop entry ---------------------------------------------------
mkdir -p "${DESKTOP_DIR}"
{
  echo "[Desktop Entry]"
  echo "Type=Application"
  echo "Name=${DISPLAY_NAME}"
  echo "Comment=Bluetooth gamepad controller for the BT24 Arduino robot"
  echo "Exec=env APPIMAGE_EXTRACT_AND_RUN=1 ${APPIMAGE_PATH}"
  [ -n "${ICON_PATH}" ] && echo "Icon=${ICON_PATH}"
  echo "Terminal=false"
  echo "Categories=Utility;Game;"
  echo "StartupWMClass=${DISPLAY_NAME}"
} > "${DESKTOP_FILE}"
chmod +x "${DESKTOP_FILE}"
step "Desktop entry: ${DESKTOP_FILE}"

# Refresh the menu cache so KDE picks it up immediately.
command -v update-desktop-database >/dev/null 2>&1 \
  && update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true

# --- Done -------------------------------------------------------------------
cat <<EOF

${GREEN}Robot Controller is installed.${NC}

  AppImage : ${APPIMAGE_PATH}
  Menu     : Application Menu → Utilities → ${DISPLAY_NAME}

To play it from Gaming Mode:

  1. Open Steam (still in Desktop Mode).
  2. Library  →  +  →  Add a Non-Steam Game.
  3. Pick "${DISPLAY_NAME}" from the list (it appears because the .desktop
     file is registered) and click Add Selected Programs.
  4. Switch back to Gaming Mode — the app shows up under "Non-Steam".

Re-run this script any time to upgrade to the newest release.

EOF
