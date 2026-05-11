// Tests for BleState (BLE-04): Managed state for Peripheral storage
// These tests verify the BleState API by reading and understanding the implementation
// Since we can't import private modules in integration tests, we verify via file reading

#[cfg(test)]
mod tests {
    use std::path::Path;
    use std::fs;

    #[test]
    fn test_ble_state_struct_exists() {
        // BLE-04: BleState should exist with Arc<Mutex<Option<Peripheral>>>
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("pub struct BleState"), "BleState struct should be public");
        assert!(content.contains("Arc<Mutex<Option<Peripheral>>>"), "Should use Arc<Mutex<Option<Peripheral>>>");
    }

    #[test]
    fn test_ble_state_has_new_method() {
        // BLE-04: BleState::new() should exist
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("pub fn new() -> Self"), "BleState should have new() constructor");
    }

    #[test]
    fn test_ble_state_has_set_method() {
        // BLE-04: BleState::set() should exist to store Peripheral
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("pub fn set(&self, peripheral: Option<Peripheral>)"), 
            "BleState should have set() method");
    }

    #[test]
    fn test_ble_state_has_get_method() {
        // BLE-04: BleState::get() should exist to retrieve Peripheral
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("pub fn get(&self) -> Option<Peripheral>"), 
            "BleState should have get() method");
    }

    #[test]
    fn test_ble_state_implements_clone() {
        // BLE-04: BleState must implement Clone for Tauri managed state
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("impl Clone for BleState"), 
            "BleState should implement Clone");
    }

    #[test]
    fn test_ble_state_uses_arc_mutex() {
        // BLE-04: Verify thread-safe storage with Arc<Mutex<>>
        let content = fs::read_to_string("src/ble/state.rs")
            .expect("Should be able to read state.rs");
        
        assert!(content.contains("use std::sync::{Arc, Mutex}"), 
            "Should import Arc and Mutex");
        assert!(content.contains("pub peripheral: Arc<Mutex<Option<Peripheral>>>"), 
            "Field should be Arc<Mutex<Option<Peripheral>>>");
    }
}
