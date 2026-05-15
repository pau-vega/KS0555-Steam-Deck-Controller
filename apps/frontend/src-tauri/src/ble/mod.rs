pub mod state;
use crate::domain::invert::INVERTED;
pub use state::BleState;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};

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
    if command.len() != 1 {
        return Err(format!(
            "Invalid command: '{}'. Must be single char (F/B/L/R/S)",
            command
        ));
    }

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
