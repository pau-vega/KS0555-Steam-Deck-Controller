// Tests for ble_connect command (BLE-01)
// BLE-01: invoke('ble_connect') scans for BT24, connects, and emits 'ble-state-changed' events

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_ble_connect_function_exists() {
        // BLE-01: ble_connect should exist as a tauri::command
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("pub async fn ble_connect"), 
            "ble_connect function should be public and async");
        assert!(content.contains("#[tauri::command]"), 
            "ble_connect should be a Tauri command");
    }

    #[test]
    fn test_ble_connect_returns_result_string() {
        // BLE-01 with D-04: Returns Result<(), String>
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("-> Result<(), String>"), 
            "ble_connect should return Result<(), String>");
    }

    #[test]
    fn test_ble_connect_emits_connecting() {
        // BLE-01: Should emit "ble-state-changed" with "connecting"
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("\"connecting\""), 
            "Should emit 'connecting' state");
        assert!(content.contains("ble-state-changed"), 
            "Should emit ble-state-changed event");
    }

    #[test]
    fn test_ble_connect_emits_connected() {
        // BLE-01: Should emit "ble-state-changed" with "connected" after success
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("\"connected\""), 
            "Should emit 'connected' state");
    }

    #[test]
    fn test_ble_connect_scans_for_bt24() {
        // BLE-01: Should scan for BT24 device
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("BT24"), 
            "Should reference BT24 device name");
        assert!(content.contains("start_scan"), 
            "Should start BLE scan");
    }

    #[test]
    fn test_ble_connect_has_5s_timeout() {
        // BLE-01 with D-03: 5-second scan timeout
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("SCAN_TIMEOUT"), 
            "Should have SCAN_TIMEOUT constant");
        assert!(content.contains("Duration::from_secs(5)"), 
            "Timeout should be 5 seconds");
    }

    #[test]
    fn test_ble_connect_stores_peripheral_in_state() {
        // BLE-01: Connected Peripheral stored in Tauri managed state
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("state.set(Some(peripheral))"), 
            "Should store connected peripheral in state");
    }

    #[test]
    fn test_bt24_service_uuid_defined() {
        // BLE-01: Should have BT24 service UUID
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("0000ffe0-0000-1000-8000-00805f9b34fb"), 
            "Should define BT24 service UUID");
    }
}
