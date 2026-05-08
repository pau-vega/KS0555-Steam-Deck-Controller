set shell := ["bash", "-uc"]

# List available recipes
[private]
default:
    @just --list --unsorted

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
[default]
phoenix: nuke
    pnpm install
