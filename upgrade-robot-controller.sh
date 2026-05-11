#!/usr/bin/env bash
# upgrade-robot-controller.sh — Install or upgrade Robot Controller Flatpak
#
# Usage: upgrade-robot-controller.sh [--check] [--force] [--help] [--version]
#   --check   Check for updates without installing
#   --force   Skip confirmation prompt
#   --help    Show this help message
#   --version Show script version
#
# Dependencies: curl, jq, flatpak (all present on SteamOS by default)
#
# This script is dual-purpose:
#   - Fresh install: if com.ks0555.robotcontroller is not installed
#   - Upgrade check: if installed, compare with latest GitHub release
#
# Downloads .flatpak + .sha256, verifies checksum, then installs.
set -euo pipefail

REPO="pau-vega/KS0555-Steam-Deck-Controller-2"
APP_ID="com.ks0555.robotcontroller"
TEMP_DIR="/tmp/robot-controller-upgrade"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
SCRIPT_VERSION="1.0.0"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

step()  { echo -e "${GREEN}→${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*" >&2; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }

cleanup() {
    rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

# --- Help / Version -----------------------------------------------------------

show_help() {
    cat <<EOF
Robot Controller — Flatpak Install/Upgrade Launcher

Usage: upgrade-robot-controller.sh [OPTIONS]

Options:
  --check    Check for updates without installing
  --force    Skip confirmation prompt (non-interactive)
  --help     Show this help message
  --version  Show script version

Examples:
  ./upgrade-robot-controller.sh              # Check and install/upgrade
  ./upgrade-robot-controller.sh --check      # Only check for updates
  ./upgrade-robot-controller.sh --force      # Install without confirmation
EOF
    exit 0
}

show_version() {
    echo "upgrade-robot-controller.sh version ${SCRIPT_VERSION}"
    exit 0
}

# --- Flag Parsing -------------------------------------------------------------

CHECK_ONLY=false
FORCE=false

parse_flags() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --help)    show_help ;;
            --version) show_version ;;
            --check)   CHECK_ONLY=true;  shift ;;
            --force)   FORCE=true;       shift ;;
            *)
                echo "Unknown option: $1" >&2
                echo "Usage: upgrade-robot-controller.sh [--check] [--force] [--help] [--version]" >&2
                exit 1
                ;;
        esac
    done
}

# --- Dependency Checks --------------------------------------------------------

check_dependencies() {
    local missing=false

    for cmd in curl jq; do
        if ! command -v "${cmd}" &>/dev/null; then
            warn "Missing required tool: ${cmd}"
            missing=true
        fi
    done

    if ! command -v flatpak &>/dev/null; then
        warn "flatpak is not installed. This script requires Flatpak to install the Robot Controller."
        warn "On Steam Deck, run: sudo steamos-readonly disable && sudo pacman -S flatpak && sudo steamos-readonly enable"
        warn "On other Linux distributions, install flatpak via your package manager."
        missing=true
    fi

    if ! command -v jq &>/dev/null; then
        echo -e "  Install jq with your package manager:"
        echo -e "    Debian/Ubuntu: sudo apt-get install jq"
        echo -e "    Arch/SteamOS:  sudo pacman -S jq"
        echo -e "    Fedora:        sudo dnf install jq"
    fi

    if [ "$missing" = true ]; then
        fail "Missing required tools. Install them and try again."
    fi
}

# --- Version Helpers ----------------------------------------------------------

get_installed_version() {
    if ! flatpak info "${APP_ID}" &>/dev/null; then
        echo "none"
        return
    fi

    local commit
    commit=$(flatpak info --show-commit "${APP_ID}" 2>/dev/null || true)
    local version
    version=$(flatpak info "${APP_ID}" 2>/dev/null | grep -i "^Version:" | head -1 | awk '{print $2}' || true)

    if [ -n "${version}" ]; then
        echo "${version}"
    else
        echo "installed-${commit}"
    fi
}

get_latest_version() {
    local response
    response=$(curl -fsSL \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -w "\n%{http_code} %{exit_status}" \
        "${API_URL}" 2>/dev/null || true)

    local http_code
    http_code=$(echo "${response}" | tail -1 | awk '{print $1}')

    if [ "${http_code}" = "0" ] || [ -z "${http_code}" ]; then
        fail "Network error: unable to reach GitHub Releases API. Check your internet connection."
    fi

    if [ "${http_code}" = "403" ]; then
        local rate_remaining
        rate_remaining=$(curl -fsSL -I "${API_URL}" 2>/dev/null | grep -i "x-ratelimit-remaining" | awk '{print $2}' | tr -d '\r' || echo "0")
        if [ "${rate_remaining}" = "0" ]; then
            local reset_time
            reset_time=$(curl -fsSL -I "${API_URL}" 2>/dev/null | grep -i "x-ratelimit-reset" | awk '{print $2}' | tr -d '\r' || echo "")
            if [ -n "${reset_time}" ]; then
                local wait_seconds
                wait_seconds=$(( reset_time - $(date +%s) ))
                wait_seconds=$(( wait_seconds > 0 ? wait_seconds : 60 ))
                fail "GitHub API rate limit reached. Try again in ${wait_seconds} seconds."
            fi
            fail "GitHub API rate limit reached. Try again later."
        fi
        fail "GitHub API returned 403 Forbidden. Check repository access."
    fi

    if [ "${http_code}" != "200" ]; then
        fail "GitHub API returned HTTP ${http_code}. Unable to fetch release info."
    fi

    local body
    body=$(echo "${response}" | head -n -1)

    local tag_name
    tag_name=$(echo "${body}" | jq -r '.tag_name // empty')
    if [ -z "${tag_name}" ]; then
        fail "No releases found at ${API_URL}. The repository may have no releases yet."
    fi

    local release_body
    release_body=$(echo "${body}" | jq -r '.body // "No release notes provided."')

    local flatpak_url
    flatpak_url=$(echo "${body}" | jq -r '.assets[] | select(.name | test("RobotController-.*-x86_64\\.flatpak$")) | .browser_download_url // empty' | head -1)

    local sha256_url
    sha256_url=$(echo "${body}" | jq -r '.assets[] | select(.name | test("RobotController-.*-x86_64\\.flatpak\\.sha256$")) | .browser_download_url // empty' | head -1)

    if [ -z "${flatpak_url}" ]; then
        fail "No .flatpak asset found in latest release (${tag_name})."
    fi

    if [ -z "${sha256_url}" ]; then
        warn "No .sha256 file found for ${tag_name} — skipping checksum verification."
    fi

    LATEST_TAG="${tag_name}"
    LATEST_BODY="${release_body}"
    LATEST_FLATPAK_URL="${flatpak_url}"
    LATEST_SHA256_URL="${sha256_url}"
}

# --- Version Comparison -------------------------------------------------------

UP_TO_DATE=0
UPGRADE_AVAILABLE=1
SPECIAL_INSTALL=2

compare_versions() {
    local installed="$1"
    local latest="$2"

    latest="${latest#v}"

    if [ "${installed}" = "none" ]; then
        return ${SPECIAL_INSTALL}
    fi

    installed="${installed#v}"

    if [ "${installed}" = "${latest}" ]; then
        return ${UP_TO_DATE}
    fi

    if [ "${installed}" = "installed"* ]; then
        return ${UPGRADE_AVAILABLE}
    fi

    local IFS=.
    local i_ver=(${installed})
    local l_ver=(${latest})

    for i in 0 1 2; do
        local iv="${i_ver[$i]:-0}"
        local lv="${l_ver[$i]:-0}"
        if [ "${iv}" -lt "${lv}" ] 2>/dev/null; then
            return ${UPGRADE_AVAILABLE}
        elif [ "${iv}" -gt "${lv}" ] 2>/dev/null; then
            return ${UP_TO_DATE}
        fi
    done

    return ${UP_TO_DATE}
}

# --- Download and Verification ------------------------------------------------

download_and_verify() {
    mkdir -p "${TEMP_DIR}"

    step "Cleaning up old files in ${TEMP_DIR}..."
    rm -f "${TEMP_DIR}"/RobotController-*.flatpak "${TEMP_DIR}"/RobotController-*.flatpak.sha256

    step "Downloading ${LATEST_FLATPAK_URL##*/}..."
    if ! curl -fL --progress-bar -o "${TEMP_DIR}/${LATEST_FLATPAK_URL##*/}" "${LATEST_FLATPAK_URL}"; then
        fail "Download failed for ${LATEST_FLATPAK_URL##*/}."
    fi

    if [ -n "${LATEST_SHA256_URL}" ]; then
        step "Downloading checksum file..."
        if ! curl -fL -o "${TEMP_DIR}/${LATEST_SHA256_URL##*/}" "${LATEST_SHA256_URL}"; then
            warn "Failed to download checksum file. Skipping verification."
        else
            step "Verifying checksum..."
            (
                cd "${TEMP_DIR}"
                if ! sha256sum -c RobotController-*.flatpak.sha256; then
                    fail "Checksum verification FAILED. The downloaded file may be corrupt or tampered with. Aborting."
                fi
            )
            ok "Checksum verified successfully."
        fi
    else
        warn "No checksum file available — skipping verification."
    fi
}

# --- Installation -------------------------------------------------------------

install_flatpak() {
    local flatpak_path
    flatpak_path=$(ls "${TEMP_DIR}"/RobotController-*-x86_64.flatpak 2>/dev/null | head -1 || true)

    if [ -z "${flatpak_path}" ]; then
        fail "No .flatpak file found in ${TEMP_DIR}. Download may have failed."
    fi

    step "Installing ${flatpak_path}..."
    flatpak install --user --reinstall "${flatpak_path}"
}

# --- Changelog Display --------------------------------------------------------

print_changelog() {
    if [ -n "${LATEST_BODY}" ] && [ "${LATEST_BODY}" != "No release notes provided." ]; then
        echo ""
        echo -e "${BOLD}Release Notes for ${LATEST_TAG}:${NC}"
        echo "------------------------"
        echo "${LATEST_BODY}"
        echo "------------------------"
    fi
}

# --- Fresh Install Instructions -----------------------------------------------

print_fresh_install_done() {
    echo ""
    ok "Robot Controller ${LATEST_TAG} installed."
    echo ""
    echo "To add it as a Non-Steam Game in Gaming Mode:"
    echo ""
    echo "  1. Open Steam in Desktop Mode."
    echo "  2. Library → + → Add a Non-Steam Game."
    echo "  3. Find 'Robot Controller' in the list and add it."
    echo "  4. Switch to Gaming Mode — it appears under 'Non-Steam'."
    echo ""
    echo "Run this script again to check for upgrades:"
    echo "  ./upgrade-robot-controller.sh --check"
}

# --- Main ---------------------------------------------------------------------

main() {
    parse_flags "$@"
    check_dependencies

    step "Checking installed version..."
    local installed_version
    installed_version=$(get_installed_version)
    if [ "${installed_version}" = "none" ]; then
        echo "  (not installed)"
    else
        echo "  Installed: v${installed_version}"
    fi

    step "Fetching latest release from GitHub..."
    get_latest_version
    echo "  Latest: ${LATEST_TAG}"

    compare_versions "${installed_version}" "${LATEST_TAG}"
    local cmp_result=$?

    case ${cmp_result} in
        ${SPECIAL_INSTALL})
            echo ""
            echo -e "${BOLD}Installing Robot Controller for the first time...${NC}"
            download_and_verify
            install_flatpak
            print_fresh_install_done
            ;;

        ${UP_TO_DATE})
            installed_version="${installed_version#v}"
            echo ""
            ok "Robot Controller is up to date (${installed_version})"
            ;;

        ${UPGRADE_AVAILABLE})
            installed_version="${installed_version#v}"
            local latest_clean="${LATEST_TAG#v}"
            echo ""
            echo -e "${BOLD}Upgrade available:${NC} v${installed_version} → ${LATEST_TAG}"
            print_changelog

            if [ "${CHECK_ONLY}" = true ]; then
                echo ""
                warn "Run without --check to upgrade."
                exit 0
            fi

            if [ "${FORCE}" != true ]; then
                echo ""
                read -r -p "Install version ${LATEST_TAG}? [y/N] " confirm
                case "${confirm}" in
                    [yY]|[yY][eE][sS]) ;;
                    *)
                        echo "Upgrade cancelled."
                        exit 0
                        ;;
                esac
            fi

            download_and_verify
            install_flatpak
            echo ""
            ok "Robot Controller upgraded to ${LATEST_TAG}"
            ;;
    esac
}

main "$@"
