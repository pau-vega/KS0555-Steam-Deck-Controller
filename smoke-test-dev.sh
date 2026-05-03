#!/bin/bash
# Smoke test for Task 1-05: Verify pnpm dev starts both frontend and backend
# Tests MONO-02 and MONO-04 requirements

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Smoke Test: pnpm dev starts both frontend and backend ==="
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    # Kill all child processes
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "turbo dev" 2>/dev/null || true
    sleep 2
}

trap cleanup EXIT

# Start pnpm dev in background
echo "Starting pnpm dev..."
pnpm dev &
DEV_PID=$!

# Wait for servers to start (max 30 seconds)
echo "Waiting for backend (port 3001)..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is up on port 3001${NC}"
        BACKEND_UP=true
        break
    fi
    sleep 1
done

if [ -z "$BACKEND_UP" ]; then
    echo -e "${RED}✗ Backend failed to start on port 3001${NC}"
    exit 1
fi

# Check backend response
echo "Checking backend response..."
BACKEND_RESPONSE=$(curl -s http://localhost:3001)
if echo "$BACKEND_RESPONSE" | grep -q "hello"; then
    echo -e "${GREEN}✓ Backend returns expected response${NC}"
else
    echo -e "${RED}✗ Backend response unexpected: $BACKEND_RESPONSE${NC}"
    exit 1
fi

# Wait for frontend (max 30 seconds)
echo "Waiting for frontend (port 5173)..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is up on port 5173${NC}"
        FRONTEND_UP=true
        break
    fi
    sleep 1
done

if [ -z "$FRONTEND_UP" ]; then
    echo -e "${RED}✗ Frontend failed to start on port 5173${NC}"
    exit 1
fi

# Check frontend response (Vite serves HTML)
echo "Checking frontend response..."
FRONTEND_RESPONSE=$(curl -s http://localhost:5173)
if echo "$FRONTEND_RESPONSE" | grep -qi "<!doctype html>\|<html"; then
    echo -e "${GREEN}✓ Frontend returns HTML${NC}"
else
    echo -e "${RED}✗ Frontend response doesn't contain HTML${NC}"
    echo "Response: $(echo "$FRONTEND_RESPONSE" | head -20)"
    exit 1
fi

echo ""
echo -e "${GREEN}=== ALL SMOKE TESTS PASSED ===${NC}"
echo "Both frontend (port 5173) and backend (port 3001) are running."
exit 0
