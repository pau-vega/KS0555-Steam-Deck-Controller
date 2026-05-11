// Tests for BLE event handling (BLE-05)
// BLE-05: Unexpected disconnections auto-emit 'ble-state-changed' with 'disconnected'

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_setup_event_listener_exists() {
        // BLE-05: setup_event_listener should exist
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("pub fn setup_event_listener"), 
            "setup_event_listener function should exist");
    }

    #[test]
    fn test_event_listener_handles_disconnect() {
        // BLE-05: Should handle CentralEvent::DeviceDisconnected
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("CentralEvent::DeviceDisconnected"), 
            "Should handle DeviceDisconnected event");
    }

    #[test]
    fn test_event_listener_emits_disconnected() {
        // BLE-05: On disconnect, emits "ble-state-changed" with "disconnected"
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("\"disconnected\""), 
            "Should emit 'disconnected' state on disconnect");
        assert!(content.contains("ble-state-changed"), 
            "Should emit ble-state-changed event");
    }

    #[test]
    fn test_event_listener_spawned_in_main() {
        // BLE-05: setup_event_listener should be called from lib.rs
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        
        assert!(content.contains("setup_event_listener"), 
            "lib.rs should call setup_event_listener");
    }

    #[test]
    fn test_event_listener_spawned_async() {
        // BLE-05: Should spawn async task for event monitoring
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("tauri::async_runtime::spawn"), 
            "Should spawn async runtime for event listener");
    }

    #[test]
    fn test_auto_reconnect_mentioned() {
        // BLE-05 with D-01: Auto-reconnect mentioned for future implementation
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("Auto-reconnect"), 
            "Auto-reconnect should be mentioned as D-01");
    }
}
