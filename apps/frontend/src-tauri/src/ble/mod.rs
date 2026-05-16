pub mod state;
use crate::domain::invert::INVERTED;
use regex::Regex;
pub use state::BleState;
use std::sync::atomic::Ordering;
use std::sync::LazyLock;
use tauri::{AppHandle, Emitter};

/// Accept-set for `ble_send` payloads:
/// - `^[FBLR]\d{2,3}\n$` — directional PWM (numeric range enforced separately)
/// - `^S\n$`             — stop
///
/// `.expect(...)` is acceptable here: the pattern is a compile-time constant,
/// so any panic at module load is a developer typo we want surfaced loudly.
static BLE_COMMAND_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[FBLR]\d{2,3}\n$|^S\n$").expect("static regex compiles"));

/// Pure validator for BLE wire payloads. Extracted so unit tests can hit the
/// validation branches without constructing a `tauri::State<BleState>`.
fn validate_ble_payload(command: &str) -> Result<(), String> {
    if !BLE_COMMAND_RE.is_match(command) {
        return Err(format!(
            "Invalid BLE payload {:?}: expected '<dir><pwm>\\n' with dir in F|B|L|R and pwm in 80..=255, or 'S\\n'",
            command
        ));
    }

    // Stop is fully validated by the regex; no numeric range to check.
    if command.starts_with('S') {
        return Ok(());
    }

    // Drop the leading direction char and the trailing newline; what remains
    // is the pwm digit substring, already constrained to 2–3 ASCII digits by
    // the regex. Use u16 so 999 doesn't overflow before the range check fires.
    let pwm_str = &command[1..command.len() - 1];
    let pwm: u16 = pwm_str.parse().map_err(|_| {
        format!(
            "Invalid BLE payload {:?}: pwm digits failed to parse (expected 80..=255)",
            command
        )
    })?;

    if !(80..=255).contains(&pwm) {
        return Err(format!(
            "Invalid BLE payload {:?}: pwm {} out of range (expected 80..=255)",
            command, pwm
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn ble_connect(app: AppHandle, state: tauri::State<'_, BleState>) -> Result<(), String> {
    app.emit("ble-state-changed", "connecting")
        .map_err(|e| format!("Failed to emit connecting state: {}", e))?;

    state.port().connect().await?;

    app.emit("ble-state-changed", "connected")
        .map_err(|e| format!("Failed to emit connected: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn ble_send(
    _app: AppHandle,
    state: tauri::State<'_, BleState>,
    command: String,
) -> Result<(), String> {
    validate_ble_payload(&command)?;
    state.port().write(command.as_bytes()).await
}

#[tauri::command]
pub fn get_invert_state() -> bool {
    INVERTED.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn toggle_invert(app: AppHandle) -> Result<bool, String> {
    let new_val = INVERTED.fetch_xor(true, Ordering::SeqCst) ^ true;
    app.emit("invert-changed", new_val)
        .map_err(|e| format!("Failed to emit invert-changed: {}", e))?;
    Ok(new_val)
}

#[cfg(test)]
mod tests {
    use super::*;

    // -------- Accept-path tests --------

    #[test]
    fn accepts_forward_minimum() {
        assert!(validate_ble_payload("F80\n").is_ok());
    }

    #[test]
    fn accepts_forward_default() {
        assert!(validate_ble_payload("F150\n").is_ok());
    }

    #[test]
    fn accepts_forward_max() {
        assert!(validate_ble_payload("F255\n").is_ok());
    }

    #[test]
    fn accepts_all_directions() {
        for dir in ["F", "B", "L", "R"] {
            let payload = format!("{}138\n", dir);
            assert!(
                validate_ble_payload(&payload).is_ok(),
                "expected {:?} to be accepted",
                payload
            );
        }
    }

    #[test]
    fn accepts_stop() {
        assert!(validate_ble_payload("S\n").is_ok());
    }

    #[test]
    fn accepts_two_digit_pwm() {
        for payload in ["F80\n", "L99\n", "R85\n"] {
            assert!(
                validate_ble_payload(payload).is_ok(),
                "expected {:?} to be accepted",
                payload
            );
        }
    }

    // -------- Reject-path tests --------

    fn expect_err(payload: &str) -> String {
        match validate_ble_payload(payload) {
            Ok(()) => panic!("expected validate_ble_payload({:?}) to be Err", payload),
            Err(msg) => msg,
        }
    }

    #[test]
    fn rejects_empty_string() {
        let err = expect_err("");
        assert!(
            err.contains("Invalid BLE payload"),
            "error should mention the rejection: {}",
            err
        );
    }

    #[test]
    fn rejects_legacy_single_char() {
        for payload in ["F", "B", "L", "R"] {
            let err = expect_err(payload);
            assert!(
                err.contains("Invalid BLE payload"),
                "error should mention the rejection: {}",
                err
            );
        }
    }

    #[test]
    fn rejects_no_newline() {
        let err = expect_err("F138");
        assert!(err.contains("Invalid BLE payload"), "got: {}", err);
    }

    #[test]
    fn rejects_lowercase_direction() {
        for payload in ["f138\n", "s\n"] {
            let err = expect_err(payload);
            assert!(err.contains("Invalid BLE payload"), "got: {}", err);
        }
    }

    #[test]
    fn rejects_invalid_direction_char() {
        for payload in ["X138\n", "Z80\n"] {
            let err = expect_err(payload);
            assert!(err.contains("Invalid BLE payload"), "got: {}", err);
        }
    }

    #[test]
    fn rejects_pwm_below_range() {
        for payload in ["F00\n", "F01\n", "F79\n"] {
            let err = expect_err(payload);
            assert!(
                err.contains("80") && err.contains("255"),
                "range error should mention 80 and 255, got: {}",
                err
            );
        }
    }

    #[test]
    fn rejects_pwm_above_range() {
        for payload in ["F256\n", "F999\n"] {
            let err = expect_err(payload);
            assert!(
                err.contains("80") && err.contains("255"),
                "range error should mention 80 and 255, got: {}",
                err
            );
        }
    }

    #[test]
    fn rejects_extra_data_after_newline() {
        // T-20-08 mitigation: regex `$` anchor enforces single command.
        let err = expect_err("F138\nB255\n");
        assert!(err.contains("Invalid BLE payload"), "got: {}", err);
    }

    #[test]
    fn rejects_extra_text_before() {
        for payload in [" F138\n", "!F138\n"] {
            let err = expect_err(payload);
            assert!(err.contains("Invalid BLE payload"), "got: {}", err);
        }
    }

    #[test]
    fn rejects_huge_payload() {
        // T-20-12 mitigation: anchored regex with bounded \d{2,3} rejects long input.
        let payload = format!("F{}\n", "1".repeat(100));
        let err = expect_err(&payload);
        assert!(err.contains("Invalid BLE payload"), "got: {}", err);
    }

    #[test]
    fn rejects_unicode_garbage() {
        for payload in ["F💩\n", "Ｆ138\n"] {
            let err = expect_err(payload);
            assert!(err.contains("Invalid BLE payload"), "got: {}", err);
        }
    }

    #[test]
    fn accept_path_byte_identical() {
        // Defensive: catches accidental Unicode normalization of the literal.
        // F=0x46, '1'=0x31, '3'=0x33, '8'=0x38, '\n'=0x0A
        assert_eq!(
            "F138\n".as_bytes(),
            &[0x46u8, 0x31, 0x33, 0x38, 0x0A][..],
            "F138\\n byte sequence must be exactly the ASCII bytes we ship to BT24"
        );
    }
}
