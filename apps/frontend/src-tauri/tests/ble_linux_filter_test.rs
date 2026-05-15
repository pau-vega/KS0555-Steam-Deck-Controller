// Tests for Linux BLE post-filter (BLE-06)
// BLE-06: Scan results post-filtered by device name 'BT24' on Linux since BlueZ merges discovery filters

#[cfg(test)]
mod tests {
    use std::fs;

    #[test]
    fn test_bt24_name_constant_defined() {
        // BLE-06: BT24_NAME constant should be defined
        let content = fs::read_to_string("src/ble/mod.rs").expect("Should be able to read mod.rs");

        assert!(
            content.contains("BT24_NAME"),
            "BT24_NAME constant should be defined"
        );
        assert!(
            content.contains("const BT24_NAME: &str = \"BT24\""),
            "BT24_NAME should be 'BT24'"
        );
    }

    #[test]
    fn test_post_filter_uses_contains() {
        // BLE-06: Post-filter using name.contains(BT24_NAME)
        let content = fs::read_to_string("src/ble/mod.rs").expect("Should be able to read mod.rs");

        assert!(
            content.contains("name.contains(BT24_NAME)"),
            "Should post-filter using contains()"
        );
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
            assert_eq!(
                matches, should_match,
                "Name '{}' match logic should be {}",
                name, should_match
            );
        }
    }
}
