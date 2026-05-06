#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ble;
use ble::{BleState, setup_event_listener, ble_connect, ble_disconnect, ble_send};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Create and manage BLE state (D-05)
            let ble_state = BleState::new();
            app.manage(ble_state.clone());

            // Setup event listener for auto-disconnect (BLE-05)
            setup_event_listener(app.handle().clone(), ble_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ble_connect,    // BLE-01
            ble_disconnect, // BLE-02
            ble_send,       // BLE-03
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
