#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Empty setup for Phase 6 - will add state management in Phase 7
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
