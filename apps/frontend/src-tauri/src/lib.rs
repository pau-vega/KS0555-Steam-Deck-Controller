pub mod ble;
pub mod gamepad;

use ble::{setup_event_listener, ble_connect, ble_disconnect, ble_send, BleState};
use gamepad::setup_gamepad_monitor;
use tauri::Manager;

fn in_flatpak() -> bool {
    // Belt-and-suspenders Flatpak detection (D-01).
    // FLATPAK_ID is set by the Flatpak runtime at container start.
    // /.flatpak-info is the canonical file-based signal.
    std::env::var("FLATPAK_ID").is_ok()
        || std::path::Path::new("/.flatpak-info").exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // On SteamOS the system bus socket lives under /run/host/run/dbus/
    // btleplug uses DBUS_SYSTEM_BUS_ADDRESS to locate it; set it if unset.
    if !in_flatpak() {
        // Inside Flatpak the runtime proxies the system bus via DBUS_SYSTEM_BUS_ADDRESS.
        // Overwriting it with /run/host/run/dbus/ (which doesn't exist in the sandbox)
        // would break btleplug → BlueZ communication (Pitfall 13).
        // Only rewrite for native AppImage / host-side SteamOS where the socket path differs.
        eprintln!("[debug] D-Bus rewrite: not in Flatpak, checking DBUS_SYSTEM_BUS_ADDRESS");
        if std::env::var("DBUS_SYSTEM_BUS_ADDRESS").is_err() {
            let steamos_socket = "/run/host/run/dbus/system_bus_socket";
            if std::path::Path::new(steamos_socket).exists() {
                std::env::set_var(
                    "DBUS_SYSTEM_BUS_ADDRESS",
                    format!("unix:path={}", steamos_socket),
                );
            }
        }
    }

    // Gaming mode (Gamescope) — WebKitGTK fails GPU compositing under Gamescope.
    // Disable compositing mode so the webview falls back to simple rendering.
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

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
