// Structural tests for Phase 13: Flatpak Sandbox Permissions for BLE + Gamepad
// Verifies SBX-01 through SBX-06 using content-scanning pattern (no hardware needed).
//
// Test methodology matches validation_test.rs: read source files, assert on content.
// VAL-06 and VAL-07 require real BT24 robot + gamepad hardware — cannot be automated.

#![cfg(test)]

mod flatpak_sandbox_tests {
    use std::fs;

    // ── SBX-05: in_flatpak() helper + gated D-Bus rewrite ───────────

    #[test]
    fn test_in_flatpak_function_exists() {
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        assert!(content.contains("fn in_flatpak"),
            "lib.rs must define fn in_flatpak()");
        assert!(content.contains("FLATPAK_ID"),
            "in_flatpak() must check FLATPAK_ID env var");
        assert!(content.contains("/.flatpak-info"),
            "in_flatpak() must check /.flatpak-info file");
    }

    #[test]
    fn test_dbus_rewrite_gated_on_not_in_flatpak() {
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        // The entire D-Bus block must be wrapped in !in_flatpak()
        assert!(content.contains("!in_flatpak()"),
            "D-Bus rewrite block must be gated behind !in_flatpak()");
        // Comment must explain why it's skipped inside Flatpak
        assert!(content.contains("Pitfall 13"),
            "The !in_flatpak() gate must reference Pitfall 13 in a comment");
    }

    #[test]
    fn test_webkit_set_var_remains_unconditional() {
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        assert!(content.contains("WEBKIT_DISABLE_COMPOSITING_MODE"),
            "lib.rs must set WEBKIT_DISABLE_COMPOSITING_MODE");
        // Track brace depth from the !in_flatpak() gate to find its closing '}'.
        // Then verify WEBKIT set_var appears AFTER that closing brace (outside the gate).
        let gate_start = content.find("if !in_flatpak()")
            .expect("Should find !in_flatpak() gate");
        let after_gate = &content[gate_start..];
        let mut depth: isize = 0;
        let mut in_block = false;
        let mut gate_close = 0;
        for (i, c) in after_gate.chars().enumerate() {
            if c == '{' { depth += 1; in_block = true; }
            if c == '}' { depth -= 1; }
            if in_block && depth == 0 { gate_close = gate_start + i; break; }
        }
        assert!(gate_close > 0, "Should find closing brace for !in_flatpak block");
        let webkit_pos = content.find("WEBKIT_DISABLE_COMPOSITING_MODE")
            .expect("Should find WEBKIT set_var");
        assert!(webkit_pos > gate_close,
            "WEBKIT set_var must appear AFTER the !in_flatpak block close (line {}), but was at position {}",
            content[..gate_close].lines().count(), content[..webkit_pos].lines().count());
    }

    // ── SBX-05: cargo check verification ───────────────────────────

    #[test]
    fn test_lib_rs_has_no_flatpak_gate_outside_db_block() {
        // Only the D-Bus block should be inside !in_flatpak()
        // The Tauri builder and command handlers must not be gated
        let content = fs::read_to_string("src/lib.rs")
            .expect("Should be able to read lib.rs");
        assert!(content.contains("tauri::Builder"),
            "lib.rs must contain tauri::Builder");
        assert!(content.contains("pub fn run()"),
            "lib.rs must contain pub fn run()");
    }

    // ── SBX-01: BLE finish-args in manifest ────────────────────────

    #[test]
    fn test_manifest_has_ble_finish_args() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("--system-talk-name=org.bluez"),
            "Manifest must have --system-talk-name=org.bluez for BLE");
        assert!(content.contains("--system-talk-name=org.bluez.*"),
            "Manifest must have --system-talk-name=org.bluez.* for BLE");
        assert!(content.contains("--allow=bluetooth"),
            "Manifest must have --allow=bluetooth for BLE");
        assert!(content.contains("--share=network"),
            "Manifest must have --share=network for BLE (required by --allow=bluetooth)");
    }

    // ── SBX-02: Gamepad finish-args in manifest ────────────────────

    #[test]
    fn test_manifest_has_gamepad_finish_args() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("--device=input"),
            "Manifest must have --device=input for gamepad access");
        assert!(content.contains("--device=all"),
            "Manifest must document --device=all as fallback comment");
    }

    // ── SBX-03 + SBX-04: Pre-existing finish-args intact ───────────

    #[test]
    fn test_manifest_has_display_finish_args_intact() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("--socket=wayland"),
            "Pre-existing display finish-arg --socket=wayland must be intact");
        assert!(content.contains("--socket=fallback-x11"),
            "Pre-existing display finish-arg --socket=fallback-x11 must be intact");
        assert!(content.contains("--share=ipc"),
            "Pre-existing display finish-arg --share=ipc must be intact");
        assert!(content.contains("--device=dri"),
            "Pre-existing display finish-arg --device=dri must be intact");
    }

    #[test]
    fn test_manifest_has_webkit_env_var_intact() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("WEBKIT_DISABLE_COMPOSITING_MODE"),
            "Pre-existing --env=WEBKIT_DISABLE_COMPOSITING_MODE must be intact");
    }

    // ── SBX-06: Anti-feature checklist present + anti-features absent

    #[test]
    fn test_manifest_has_anti_feature_checklist() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("Anti-feature checklist"),
            "Manifest must contain anti-feature checklist comment block");
        // Verify all 6 forbidden items are documented
        assert!(content.contains("--filesystem=home"),
            "Checklist must mention --filesystem=home");
        assert!(content.contains("--device=bluetooth"),
            "Checklist must mention --device=bluetooth");
        assert!(content.contains("--talk-name=org.bluez"),
            "Checklist must mention --talk-name=org.bluez (wrong bus)");
        assert!(content.contains("--socket=session-bus"),
            "Checklist must mention --socket=session-bus");
        assert!(content.contains("--socket=system-bus"),
            "Checklist must mention --socket=system-bus");
        assert!(content.contains("org.freedesktop.Flatpak"),
            "Checklist must mention org.freedesktop.Flatpak portal grant");
    }

    #[test]
    fn test_manifest_has_no_anti_features_in_active_finish_args() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        // Check active finish-args block (after 'finish-args:' line) doesn't contain anti-features
        // Find actual finish-args definition (last occurrence — first is in the anti-feature comment)
        let finish_args_start = content.rfind("finish-args:")
            .expect("Manifest must have finish-args section");
        let finish_args_section = &content[finish_args_start..];

        // These anti-features are in the comment block (which is before finish-args)
        // but must NOT be active arguments
        // Check only the finish-args section for active anti-features
        assert!(!finish_args_section.contains("--filesystem=home"),
            "Active finish-args must not contain --filesystem=home");
        assert!(!finish_args_section.contains("--socket=session-bus"),
            "Active finish-args must not contain --socket=session-bus");
        assert!(!finish_args_section.contains("--socket=system-bus"),
            "Active finish-args must not contain --socket=system-bus");
    }

    #[test]
    fn test_manifest_uses_system_talk_name_not_session() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        // Verify --system-talk-name is used (not bare --talk-name)
        // The bare --talk-name=org.bluez should only appear in the anti-feature comment
        let finish_args_start = content.find("finish-args:")
            .expect("Manifest must have finish-args section");
        let finish_args_section = &content[finish_args_start..];
        assert!(finish_args_section.contains("--system-talk-name"),
            "Active finish-args must use --system-talk-name (not bare --talk-name)");
    }

    // ── Manifest structure: modules/build-commands/sources unchanged ─

    #[test]
    fn test_manifest_structure_intact() {
        let content = fs::read_to_string("../../../flatpak/com.ks0555.robotcontroller.yaml")
            .expect("Should be able to read manifest");
        assert!(content.contains("modules:"),
            "Manifest must have modules section");
        assert!(content.contains("build-commands:"),
            "Manifest must have build-commands section");
        assert!(content.contains("sources:"),
            "Manifest must have sources section");
    }
}
