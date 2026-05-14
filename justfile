set shell := ["bash", "-uc"]
set positional-arguments := true

# List available recipes
[private]
default:
    @just --list --unsorted

# --- Aliases for common commands ---

alias c := check
alias f := format
alias l := lint
alias t := test

# --- Development ---

# Run all packages in dev mode (Tauri frontend + Rust backend)
[group('dev')]
dev:
    pnpm dev

# Build all packages, or a specific one: `just build @scope/pkg`
[group('dev')]
build *filter:
    {{ if filter == "" { "pnpm build" } else { "pnpm build --filter " + filter } }}

# Run linters across all packages
[group('dev')]
lint:
    pnpm lint

# Format all files with prettier
[group('dev')]
format:
    pnpm format

# Check formatting without writing
[group('dev')]
format-check:
    pnpm format:check

# Run type checking across all packages
[group('dev')]
typecheck:
    pnpm typecheck

# Run the full pre-commit suite (lint, typecheck, test)
[group('dev')]
check: lint typecheck test

# --- Testing ---

# Run unit tests
[group('test')]
test:
    pnpm test

# --- Steam Deck ---

# Build for Steam Deck
[group('steamdeck')]
build-steamdeck:
    pnpm build:steamdeck

# Install on Steam Deck via SSH
[group('steamdeck')]
install-steamdeck:
    pnpm install:steamdeck

# --- Git & Release ---

# Show git status
[group('release')]
status:
    @git status

# Show which packages have changed since main
[group('release')]
diff:
    @echo "=== Changed packages ==="
    @git diff --name-only origin/main...HEAD | grep -E '^(apps|packages)/[^/]+' | cut -d/ -f2 | sort -u || echo "No package changes detected"

# --- Debugging ---

# Show turbo cache stats
[group('debug')]
debug-turbo:
    @echo "=== Turbo Cache Directory ==="
    @ls -lh .turbo/ 2>/dev/null || echo "No .turbo cache found"
    @echo ""
    @echo "=== Cache Size ==="
    @du -sh .turbo/ 2>/dev/null || echo "Cache directory empty or missing"

# --- Maintenance ---

# Remove dist/build artifacts
[group('maintenance')]
clean-artifacts:
    find . -type d \( \
        -name dist \
        -o -name build \
        -o -name .turbo \
        -o -name .next \
        -o -name coverage \
        -o -name test-results \
        -o -name playwright-report \
        -o -name target \
    \) -prune -exec rm -rf '{}' +
    find . -name 'tsconfig.tsbuildinfo' -delete

# Remove all generated files, caches, and node_modules
[group('maintenance')]
nuke: clean-artifacts
    find . -type d -name node_modules -prune -exec rm -rf '{}' +

# Nuke everything and reinstall dependencies
[group('maintenance')]
phoenix: nuke
    pnpm install

# --- Flatpak ---

# Build Flatpak bundle from a Tauri .deb
# Usage: just flatpak-build [path-to-deb]
# Default: apps/frontend/src-tauri/target/release/bundle/deb/*.deb
[group('flatpak')]
flatpak-build deb_path="":
    @echo "→ Building Flatpak from deb..."
    @if [ -z "{{deb_path}}" ]; then \
        deb_path="apps/frontend/src-tauri/target/release/bundle/deb/"*.deb; \
    fi; \
    cp "$$deb_path" flatpak/robot-controller.deb
    @echo "→ Running flatpak-builder..."
    flatpak-builder --user --install --force-clean build-dir flatpak/com.ks0555.robotcontroller.yaml
    @echo "→ Creating Flatpak bundle..."
    mkdir -p repo
    flatpak build-export repo build-dir
    flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller
    @rm -rf build-dir repo
    @echo ""
    @echo "✓ Flatpak bundle created: RobotController-x86_64.flatpak"
    @echo "  Install: flatpak install --user RobotController-x86_64.flatpak"
    @echo "  Run:     flatpak run com.ks0555.robotcontroller"

# Install a Flatpak bundle
# Usage: just flatpak-install [path-to-flatpak]
# Default: RobotController-x86_64.flatpak
[group('flatpak')]
flatpak-install flatpak_path="RobotController-x86_64.flatpak":
    @echo "→ Installing {{flatpak_path}}..."
    flatpak install --user --reinstall "{{flatpak_path}}"

# Run the installed Flatpak app
[group('flatpak')]
flatpak-run:
    flatpak run com.ks0555.robotcontroller

# Deploy Flatpak bundle to a remote host via scp
# Usage: just flatpak-deploy <hostname> [path-to-flatpak]
# Example: just flatpak-deploy deck@steamdeck.local
[group('flatpak')]
flatpak-deploy hostname flatpak_path="RobotController-x86_64.flatpak":
    @echo "→ Transferring {{flatpak_path}} to {{hostname}}..."
    scp "{{flatpak_path}}" "{{hostname}}:~/"
    @echo ""
    @echo "✓ Flatpak transferred to {{hostname}}:~/"
    @echo "  SSH to the host and run:"
    @echo "    flatpak install --user --reinstall ~/RobotController-x86_64.flatpak"
    @echo "    flatpak run com.ks0555.robotcontroller"

# Build Flatpak bundle via Docker (for macOS/Linux without flatpak-builder)
# Default: apps/frontend/src-tauri/target/release/bundle/deb/*.deb
[group('flatpak')]
docker-flatpak-build deb_path="":
    @echo "→ Building Flatpak from deb via Docker..."
    @bash flatpak/docker-build.sh "{{deb_path}}"

# Build .deb + .flatpak entirely in Docker (no local Rust/Tauri required)
# Works on Linux x86_64 — single command, full CI pipeline.
# NOTE: On aarch64 hosts (e.g. Apple Silicon Macs), flatpak-builder cannot run because
# bubblewrap requires user namespaces (CLONE_NEWUSER) which neither Rosetta nor QEMU
# translates for amd64-on-aarch64 emulation. Use CI or a native amd64 host.
[group('flatpak')]
docker-build-all:
    @HOST_ARCH="$(uname -m)"; \
    if [ "$HOST_ARCH" = "arm64" ] || [ "$HOST_ARCH" = "aarch64" ]; then \
        echo "✗ Refusing to run on $HOST_ARCH host."; \
        echo "  Docker amd64 emulation on aarch64 hosts cannot run flatpak-builder."; \
        echo "  Root cause: bubblewrap needs user namespaces (CLONE_NEWUSER); neither Rosetta"; \
        echo "  nor QEMU translates that syscall correctly when emulating amd64 on aarch64."; \
        echo "  Tested: Rosetta fails on prctl(PR_SET_SECCOMP); QEMU fails on unshare(CLONE_NEWUSER)."; \
        echo "  Workarounds:"; \
        echo "    - Push a tag and let GitHub Actions build the flatpak (.github/workflows/build.yml)"; \
        echo "    - Run on a native x86_64 Linux host (or via 'just flatpak-build')"; \
        echo "    - SSH to a Steam Deck and run 'just flatpak-build' there"; \
        exit 1; \
    fi
    @echo "→ Building .deb in Docker (linux/amd64)..."
    docker build --platform linux/amd64 -t robot-controller-builder -f flatpak/Dockerfile .
    @echo "→ Running flatpak-builder (needs --privileged for bubblewrap)..."
    docker run --rm --platform linux/amd64 --privileged -v $(pwd):/repo robot-controller-builder
    @echo ""
    @echo "✓ Flatpak bundle: RobotController-x86_64.flatpak"
