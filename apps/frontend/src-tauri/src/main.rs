#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Empty setup for Phase 6 - will add state management in Phase 7
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
