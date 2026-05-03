# Requirements: Steam Deck Robot Controller

**Defined:** 2026-05-03
**Core Value:** Control a real robot from Steam Deck gamepad input with low latency — commands must reach the robot reliably and quickly.

## v1 Requirements

### Monorepo Structure

- [ ] **MONO-01**: pnpm workspaces with apps/frontend and apps/backend directories
- [ ] **MONO-02**: Root package.json with dev scripts (`pnpm dev` runs both apps)
- [ ] **MONO-03**: TypeScript configured for both frontend and backend
- [ ] **MONO-04**: `pnpm install` and `pnpm dev` work from root

### Backend
 
- [x] **BACK-01**: WebSocket server accepts frontend connections
- [x] **BACK-02**: Connects to DX-BT24 via serialport on `/dev/rfcomm0` at 9600 baud
- [ ] **BACK-03**: Forwards incoming WebSocket commands (F/B/L/R/S) to serial port
- [x] **BACK-04**: Auto-reconnects to serial port if connection drops
- [ ] **BACK-05**: Sends "S" (stop) command when WebSocket client disconnects
- [x] **BACK-06**: Logs received commands and serial connection status to console

### Frontend

- [ ] **FRONT-01**: Displays Bluetooth connection status (connected/disconnected)
- [ ] **FRONT-02**: Provides manual control buttons: Forward, Backward, Left, Right, Stop
- [ ] **FRONT-03**: Displays the last command sent
- [ ] **FRONT-04**: Gamepad support via `navigator.getGamepads()` with polling loop
- [ ] **FRONT-05**: Maps left analog stick to robot commands (up=F, down=B, left=L, right=R, neutral=S)
- [ ] **FRONT-06**: Deadzone handling for analog sticks (~0.15 threshold)
- [ ] **FRONT-07**: Only sends command on direction change (no continuous spam)
- [ ] **FRONT-08**: WebSocket connection to backend with reconnection logic

### Safety

- [ ] **SAFE-01**: Stop command sent when gamepad disconnects
- [ ] **SAFE-02**: Stop command sent when WebSocket connection drops

## v2 Requirements

### Motor Speed Control

- **MOTOR-01**: UI sliders for left/right motor speed
- **MOTOR-02**: Send u<number># and v<number># commands

### Connection Management

- **CONN-01**: Bluetooth device discovery and pairing from UI
- **CONN-02**: Connection history and diagnostics
- **CONN-03**: Configurable WebSocket server port

### Customization

- **CUST-01**: Customizable gamepad button/axis mapping
- **CUST-02**: Multiple robot profiles
- **CUST-03**: Adjustable deadzone threshold

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication | Single-user local device, no security needed |
| Mobile app | Steam Deck Desktop Mode only for MVP |
| Cloud connectivity | Local control only, no internet dependency |
| Video feed | Adds complexity, not core to control |
| Autonomous/path planning | Manual control only for MVP |
| Tauri/Electron/Rust | Steam Deck Desktop Mode + browser is sufficient |
| Flatpak packaging | Run from source for MVP |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | Phase 1 | Complete |
| MONO-02 | Phase 1 | Complete |
| MONO-03 | Phase 1 | Complete |
| MONO-04 | Phase 1 | Complete |
| BACK-01 | Phase 2 | Complete |
| BACK-02 | Phase 2 | Complete |
| BACK-03 | Phase 2 | Complete |
| BACK-04 | Phase 2 | Complete |
| BACK-05 | Phase 2 | Complete |
| BACK-06 | Phase 2 | Complete |
| FRONT-01 | Phase 3 | Pending |
| FRONT-02 | Phase 3 | Pending |
| FRONT-03 | Phase 3 | Pending |
| FRONT-04 | Phase 3 | Pending |
| FRONT-05 | Phase 3 | Pending |
| FRONT-06 | Phase 3 | Pending |
| FRONT-07 | Phase 3 | Pending |
| FRONT-08 | Phase 3 | Pending |
| SAFE-01 | Phase 2 | Pending |
| SAFE-02 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after completing 02-01 plan*
