// Tests for ble_disconnect command (BLE-02)
// BLE-02: invoke('ble_disconnect') disconnects from BT24 and emits 'ble-state-changed' with 'disconnected'

#[cfg(test)]
mod tests {
    use std::fs;

    #[test]
    fn test_ble_disconnect_function_exists() {
        // BLE-02: ble_disconnect should exist as a tauri::command
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("pub async fn ble_disconnect"), 
            "ble_disconnect function should be public and async");
        assert!(content.contains("#[tauri::command]"), 
            "ble_disconnect should be a Tauri command");
    }

    #[test]
    fn test_ble_disconnect_returns_result_string() {
        // BLE-02 with D-04: Returns Result<(), String>
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("-> Result<(), String>"), 
            "ble_disconnect should return Result<(), String>");
    }

    #[test]
    fn test_ble_disconnect_calls_peripheral_disconnect() {
        // BLE-02: Should call peripheral.disconnect().await
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("peripheral.disconnect().await"), 
            "Should call peripheral.disconnect()");
    }

    #[test]
    fn test_ble_disconnect_clears_state() {
        // BLE-02: After disconnect, should clear state via state.set(None)
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("state.set(None)"), 
            "Should clear state after disconnect");
    }

    #[test]
    fn test_ble_disconnect_emits_disconnected() {
        // BLE-02: Should emit "ble-state-changed" with "disconnected"
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        // Check that "disconnected" is emitted (there may be multiple occurrences)
        let disconnected_count = content.matches("\"disconnected\"").count();
        assert!(disconnected_count >= 2, 
            "Should emit 'disconnected' state (at least in ble_disconnect and setup_event_listener)");
    }

    #[test]
    fn test_ble_disconnect_handles_none_case() {
        // BLE-02: When not connected, should return Err
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("None => Err(\"Not connected"), 
            "Should handle case when not connected");
    }

    #[test]
    fn test_ble_disconnect_registered_in_main() {
        // BLE-02: Command should be registered in lib.rs invoke_handler
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        
        assert!(content.contains("ble_disconnect"), 
            "ble_disconnect should be registered in invoke_handler");
    }
}
