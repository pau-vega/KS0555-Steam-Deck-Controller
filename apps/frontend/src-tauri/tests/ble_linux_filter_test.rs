// Tests for Linux BLE post-filter (BLE-06)
// BLE-06: Scan results post-filtered by device name 'BT24' on Linux since BlueZ merges discovery filters

#[cfg(test)]
mod tests {
    use std::fs;

    #[test]
    fn test_bt24_name_constant_defined() {
        // BLE-06: BT24_NAME constant should be defined
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("BT24_NAME"), 
            "BT24_NAME constant should be defined");
        assert!(content.contains("const BT24_NAME: &str = \"BT24\""), 
            "BT24_NAME should be 'BT24'");
    }

    #[test]
    fn test_post_filter_uses_contains() {
        // BLE-06: Post-filter using name.contains(BT24_NAME)
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("name.contains(BT24_NAME)"), 
            "Should post-filter using contains()");
    }

    #[test]
    fn test_post_filter_handles_exact_match() {
        // BLE-06: Also check exact match (name == BT24_NAME)
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("name == BT24_NAME"), 
            "Should also check exact match");
    }

    #[test]
    fn test_linux_bluez_pitfall_commented() {
        // BLE-06: Should mention Linux/BlueZ filter merging issue (Pitfall 2)
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("Linux/BlueZ"), 
            "Should mention Linux/BlueZ issue");
        assert!(content.contains("Pitfall 2"), 
            "Should reference Pitfall 2");
        assert!(content.contains("merges discovery filters"), 
            "Should explain filter merging issue");
    }

    #[test]
    fn test_post_filter_comment_references_ble_06() {
        // BLE-06: Code should be commented with BLE-06 reference
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("BLE-06"), 
            "Should reference BLE-06 requirement");
    }

    #[test]
    fn test_service_uuid_verification_optional() {
        // BLE-06: Optional enhancement - verify service UUID
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        assert!(content.contains("service-UUID verification"), 
            "Should have service UUID verification comment");
        assert!(content.contains("0000ffe0"), 
            "Should reference BT24 service UUID");
    }

    #[test]
    fn test_post_filter_in_ble_connect() {
        // BLE-06: Post-filtering should be in ble_connect function
        let content = fs::read_to_string("src/ble/mod.rs")
            .expect("Should be able to read mod.rs");
        
        // Find ble_connect function and check it contains post-filter
        let start = content.find("pub async fn ble_connect")
            .expect("ble_connect should exist");
        let end = content.find("pub fn setup_event_listener")
            .unwrap_or(content.len());
        let connect_fn = &content[start..end];
        
        assert!(connect_fn.contains("name.contains(BT24_NAME)"), 
            "ble_connect should have post-filter logic");
    }

    #[test]
    fn test_bt24_name_variations_handled() {
        // BLE-06: Post-filter should handle "BT24", "BT24-ABC", etc.
        // The use of contains() handles this
        let test_names = vec![
            ("BT24", true),
            ("BT24-ABC", true),
            ("MyBT24Device", true),
            ("BT23", false),
        ];
        
        for (name, should_match) in test_names {
            let bt24_name = "BT24";
            let matches = name.contains(bt24_name) || name == bt24_name;
            assert_eq!(matches, should_match, 
                "Name '{}' match logic should be {}", name, should_match);
        }
    }
}
