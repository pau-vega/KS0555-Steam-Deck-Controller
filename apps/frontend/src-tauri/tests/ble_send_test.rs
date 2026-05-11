// Tests for ble_send command (BLE-03)
// BLE-03: invoke('ble_send', { command: 'F' }) writes command to BT24 characteristic using WriteType::WithoutResponse

#[cfg(test)]
mod tests {
    use std::fs;

    #[test]
    fn test_ble_send_function_exists() {
        // BLE-03: ble_send should exist as a tauri::command
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("pub async fn ble_send"), 
            "ble_send function should be public and async");
        assert!(content.contains("#[tauri::command]"), 
            "ble_send should be a Tauri command");
    }

    #[test]
    fn test_ble_send_returns_result_string() {
        // BLE-03 with D-04: Returns Result<(), String>
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("-> Result<(), String>"), 
            "ble_send should return Result<(), String>");
    }

    #[test]
    fn test_ble_send_has_command_parameter() {
        // BLE-03: Should accept command: String parameter
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("command: String"), 
            "ble_send should accept command parameter");
    }

    #[test]
    fn test_ble_send_validates_command_length() {
        // BLE-03: Commands are single character (F/B/L/R/S)
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("command.len() != 1"), 
            "Should validate command is single character");
        assert!(content.contains("F/B/L/R/S"), 
            "Should mention valid commands");
    }

    #[test]
    fn test_ble_send_uses_without_response() {
        // BLE-03 with D-02: Should use WriteType::WithoutResponse
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("WithoutResponse"), 
            "Should use WriteType::WithoutResponse");
    }

    #[test]
    fn test_ble_send_bt24_char_uuid() {
        // BLE-03: Characteristic UUID should be 0000ffe1-0000-1000-8000-00805f9b34fb
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("0000ffe1-0000-1000-8000-00805f9b34fb"), 
            "Should define BT24 characteristic UUID");
        assert!(content.contains("BT24_CHAR_UUID"), 
            "Should have BT24_CHAR_UUID constant");
    }

    #[test]
    fn test_ble_send_requires_connection() {
        // BLE-03: Should check if connected before sending
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("Not connected to BT24 device"), 
            "Should return error when not connected");
    }

    #[test]
    fn test_ble_send_discover_services() {
        // BLE-03: Should call peripheral.discover_services().await
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("discover_services().await"), 
            "Should discover services before writing");
    }

    #[test]
    fn test_ble_send_finds_characteristic() {
        // BLE-03: Should find characteristic with BT24_CHAR_UUID
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("BT24 characteristic not found"), 
            "Should error if characteristic not found");
    }

    #[test]
    fn test_ble_send_registered_in_main() {
        // BLE-03: Command should be registered in lib.rs invoke_handler
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        
        assert!(content.contains("ble_send"), 
            "ble_send should be registered in invoke_handler");
    }
}
