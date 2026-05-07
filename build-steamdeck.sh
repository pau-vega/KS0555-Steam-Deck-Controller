#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Steam Deck AppImage Build ==="
echo ""

# --- Check platform ---
if [ ! -f /etc/os-release ] || ! grep -qi "steamos\|arch" /etc/os-release 2>/dev/null; then
  echo -e "${YELLOW}Warning: not detected as SteamOS/Arch. Proceeding anyway.${NC}"
fi

IS_STEAMOS=false
grep -qi "steamos" /etc/os-release 2>/dev/null && IS_STEAMOS=true

# --- System deps ---
DEPS=(webkit2gtk-4.1 librsvg patchelf)

if command -v pacman &>/dev/null; then
  MISSING=()
  for pkg in "${DEPS[@]}"; do
    pacman -Qi "$pkg" &>/dev/null || MISSING+=("$pkg")
  done

  if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing deps: ${MISSING[*]}${NC}"
    if $IS_STEAMOS; then
      echo "Disabling read-only filesystem..."
      sudo steamos-readonly disable
    fi
    echo "Installing via pacman..."
    sudo pacman -S --needed "${MISSING[@]}"
    if $IS_STEAMOS; then
      echo "Re-enabling read-only filesystem..."
      sudo steamos-readonly enable
    fi
  else
    echo -e "${GREEN}All system deps found.${NC}"
  fi
elif command -v apt-get &>/dev/null; then
  DEPS_APT=(libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf)
  echo "Debian/Ubuntu detected. Installing: ${DEPS_APT[*]}"
  sudo apt-get update
  sudo apt-get install -y "${DEPS_APT[@]}"
else
  echo -e "${RED}No supported package manager found. Install deps manually:${NC}"
  echo "  arch:  sudo pacman -S webkit2gtk-4.1 librsvg patchelf"
  echo "  ubuntu: sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf"
  exit 1
fi

# --- Build ---
echo ""
echo -e "${GREEN}Building AppImage...${NC}"
pnpm --filter @ks0555/frontend tauri:build

echo ""
echo -e "${GREEN}Done. AppImage should be in apps/frontend/src-tauri/target/release/bundle/appimage/${NC}"
