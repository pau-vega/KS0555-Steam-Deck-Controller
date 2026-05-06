use gilrs::{Gilrs, EventType};
use std::thread;
use tauri::Emitter;

pub fn setup_gamepad_monitor(app: &tauri::App) -> Result<(), String> {
    let app_handle = app.handle().clone();

    // D-32: Use std::thread::spawn (not tauri::async_runtime::spawn)
    // D-33: Clone AppHandle and move into thread (implements Send)
    thread::spawn(move || {
        // D-32: Initialize gilrs inside thread
        let mut gilrs = Gilrs::new().expect("Failed to initialize gilrs");

        // D-11: Track connected Steam gamepad (first one wins)
        let mut connected_gamepad_id: Option<gilrs::GamepadId> = None;

        loop {
            // D-01: next_event() blocks until event is available
            while let Some(event) = gilrs.next_event() {
                match event.event {
                    EventType::Connected => {
                        let gamepad = gilrs.gamepad(event.id);
                        let name = gamepad.name().to_string();

                        // D-09: Pick first gamepad with name containing "Steam"
                        // D-11: Ignore additional gamepads — first one wins
                        if name.contains("Steam") && connected_gamepad_id.is_none() {
                            connected_gamepad_id = Some(event.id);

                            // D-36: gamepad-connected with { name: '...' }
                            let _ = app_handle.emit(
                                "gamepad-connected",
                                serde_json::json!({ "name": name }),
                            );
                        }
                    }
                    EventType::Disconnected => {
                        // D-12: Only react to our tracked gamepad disconnecting
                        if connected_gamepad_id == Some(event.id) {
                            connected_gamepad_id = None;

                            // D-36: gamepad-disconnected with { name: '...' }
                            let _ = app_handle.emit(
                                "gamepad-disconnected",
                                serde_json::json!({ "name": "controller" }),
                            );

                            // D-40: Auto-reconnect — loop continues, next_event()
                            // will fire on new Connected event
                        }
                    }
                    EventType::AxisChanged(_, _, _) => {
                        // Placeholder — direction detection in Plan 08-03
                    }
                    _ => {}
                }
            }

            // D-34: No lifecycle management; thread exits when main drops
        }
    });

    // D-34: Spawn in setup() hook, no lifecycle management
    Ok(())
}
