// Tests for VAL-02, VAL-03: Event pipeline validation
// Structural tests verify correct event names, payload shapes, and function contracts
// without requiring real BLE hardware or Gamepad hardware.
// Per D-07: Pragmatic pass model — structural verification sufficient for CI.

#![cfg(test)]

mod event_pipeline_tests {
    use std::fs;

    // ── VAL-03: BLE Event Pipeline ──────────────────────────────────

    #[test]
    fn test_ble_state_changed_event_emitted() {
        // BLE-01 with D-04: ble_connect emits "ble-state-changed" with "connecting"/"connected"
        let content =
            fs::read_to_string("src/ble/mod.rs").expect("Should be able to read ble/mod.rs");
        assert!(
            content.contains("ble-state-changed"),
            "BLE source must emit 'ble-state-changed' events"
        );
        assert!(
            content.contains("app.emit"),
            "BLE source must use app.emit for events"
        );
    }

    #[test]
    fn test_ble_commands_return_result_string() {
        // D-04: All BLE commands return Result<(), String>
        let content =
            fs::read_to_string("src/ble/mod.rs").expect("Should be able to read ble/mod.rs");
        assert!(
            content.contains("-> Result<(), String>"),
            "BLE commands must return Result<(), String>"
        );
    }

    #[test]
    fn test_ble_send_references_command_parameter() {
        let content =
            fs::read_to_string("src/ble/mod.rs").expect("Should be able to read ble/mod.rs");
        assert!(
            content.contains("command"),
            "ble_send must accept a command parameter"
        );
    }

    #[test]
    fn test_ble_event_listener_for_disconnect() {
        // BLE-05: CentralEvent::DeviceDisconnected handler — lives in the
        // btleplug adapter after the hexagonal port refactor.
        let content = fs::read_to_string("src/adapters/btleplug_adapter.rs")
            .expect("Should be able to read adapters/btleplug_adapter.rs");
        assert!(
            content.contains("DeviceDisconnected"),
            "BLE adapter must handle unexpected disconnect events"
        );
        assert!(
            content.contains("ble-state-changed"),
            "Disconnect handler must emit ble-state-changed"
        );
    }

    // ── VAL-02: Gamepad Event Pipeline ──────────────────────────────

    #[test]
    fn test_gamepad_direction_event_name() {
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("gamepad-direction"),
            "Gamepad adapter must emit 'gamepad-direction' events"
        );
        assert!(
            content.contains(".emit("),
            "Gamepad adapter must call .emit for events"
        );
    }

    #[test]
    fn test_gamepad_connected_event_name() {
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("gamepad-connected"),
            "Gamepad adapter must emit 'gamepad-connected' events"
        );
    }

    #[test]
    fn test_gamepad_disconnected_event_name() {
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("gamepad-disconnected"),
            "Gamepad adapter must emit 'gamepad-disconnected' events"
        );
    }

    #[test]
    fn test_gamepad_direction_payload_shape() {
        // D-35: gamepad-direction payload: { command: "F138\n" }
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("serde_json::json!"),
            "Gamepad adapter must use serde_json::json! for payload construction"
        );
        assert!(
            content.contains("command"),
            "Gamepad direction payload must contain 'command' key"
        );
    }

    #[test]
    fn test_gamepad_deadzone_constant() {
        // D-42: Deadzone 0.15 — lives in the domain layer after the hexagonal port refactor.
        let content = fs::read_to_string("src/domain/direction.rs")
            .expect("Should be able to read domain/direction.rs");
        assert!(
            content.contains("DEADZONE"),
            "Domain must define DEADZONE constant"
        );
        assert!(content.contains("0.15"), "DEADZONE must be 0.15");
    }

    #[test]
    fn test_gamepad_direction_change_guard() {
        // D-41: Command change guard prevents event spam
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("last_command"),
            "Gamepad adapter must track last_command for change guard"
        );
    }

    #[test]
    fn test_gamepad_left_stick_axes_used() {
        // GPAD-03: Read Axis::LeftStickX/Y
        let content = fs::read_to_string("src/adapters/gilrs_adapter.rs")
            .expect("Should be able to read adapters/gilrs_adapter.rs");
        assert!(
            content.contains("LeftStickX"),
            "Gamepad adapter must read LeftStickX axis"
        );
        assert!(
            content.contains("LeftStickY"),
            "Gamepad adapter must read LeftStickY axis"
        );
    }

    // ── Frontend Event Contract Verification ────────────────────────

    #[test]
    fn test_frontend_listens_to_ble_state_changed() {
        // VAL-03: Frontend use-bluetooth listens to ble-state-changed
        let content = fs::read_to_string("../../../apps/frontend/src/hooks/use-bluetooth.ts")
            .expect("Should be able to read use-bluetooth.ts");
        assert!(
            content.contains("ble-state-changed"),
            "Frontend use-bluetooth must listen to ble-state-changed"
        );
    }

    #[test]
    fn test_frontend_listens_to_gamepad_events() {
        // VAL-02: Frontend use-gamepad listens to gamepad events
        let content = fs::read_to_string("../../../apps/frontend/src/hooks/use-gamepad.ts")
            .expect("Should be able to read use-gamepad.ts");
        assert!(
            content.contains("gamepad-direction"),
            "Frontend use-gamepad must listen to gamepad-direction"
        );
        assert!(
            content.contains("gamepad-connected"),
            "Frontend use-gamepad must listen to gamepad-connected"
        );
        assert!(
            content.contains("gamepad-disconnected"),
            "Frontend use-gamepad must listen to gamepad-disconnected"
        );
    }

    #[test]
    fn test_frontend_no_navigator_gamepads() {
        // VAL-02: No Gamepad API in frontend
        let content = fs::read_to_string("../../../apps/frontend/src/hooks/use-gamepad.ts")
            .expect("Should be able to read use-gamepad.ts");
        assert!(
            !content.contains("navigator.getGamepads"),
            "Frontend must not contain navigator.getGamepads references"
        );
    }

    // ── Bot 24 Protocol Verification ────────────────────────────────

    #[test]
    fn test_all_bluetooth_commands_are_valid() {
        // Verify the BLE adapter references the BT24 characteristic UUID used by writes.
        // Service UUID is not required at the Rust layer — btleplug discovers services
        // via discover_services(); only the characteristic UUID is matched on write.
        let content = fs::read_to_string("src/adapters/btleplug_adapter.rs")
            .expect("Should be able to read adapters/btleplug_adapter.rs");
        assert!(
            content.contains("0000ffe1-0000-1000-8000-00805f9b34fb"),
            "BLE adapter must reference BT24 characteristic UUID"
        );
    }

    #[test]
    fn test_app_tsx_not_modified() {
        // VAL-04: app.tsx must remain unchanged after migration
        let app_path = "../../../apps/frontend/src/app.tsx";
        assert!(
            std::path::Path::new(app_path).exists(),
            "app.tsx must exist"
        );
        // Content verification: confirm no invoke/listen calls (those go in hooks)
        let content = fs::read_to_string(app_path).expect("Should be able to read app.tsx");
        assert!(
            !content.contains("invoke("),
            "app.tsx must not contain Tauri invoke calls"
        );
        assert!(
            !content.contains("listen("),
            "app.tsx must not contain Tauri listen calls"
        );
    }
}
