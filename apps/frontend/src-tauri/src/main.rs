#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ble;
mod gamepad;
use ble::{BleState, setup_event_listener, ble_connect, ble_disconnect, ble_send};
use gamepad::setup_gamepad_monitor;
use tauri::Manager;

fn main() {
    // On SteamOS the system bus socket lives under /run/host/run/dbus/
    // btleplug uses DBUS_SYSTEM_BUS_ADDRESS to locate it; set it if unset.
    if std::env::var("DBUS_SYSTEM_BUS_ADDRESS").is_err() {
        let steamos_socket = "/run/host/run/dbus/system_bus_socket";
        if std::path::Path::new(steamos_socket).exists() {
            std::env::set_var(
                "DBUS_SYSTEM_BUS_ADDRESS",
                format!("unix:path={}", steamos_socket),
            );
        }
    }

    // Gaming mode (Gamescope) — WebKitGTK fails GPU compositing under Gamescope.
    // Disable compositing mode so the webview falls back to simple rendering.
    if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    tauri::Builder::default()
        .setup(|app| {
            // Create and manage BLE state (D-05)
            let ble_state = BleState::new();
            app.manage(ble_state.clone());

            // Setup event listener for auto-disconnect (BLE-05)
            setup_event_listener(app.handle().clone(), ble_state);

            // Setup gamepad monitoring (GPAD-01, GPAD-06)
            setup_gamepad_monitor(app)?;

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
