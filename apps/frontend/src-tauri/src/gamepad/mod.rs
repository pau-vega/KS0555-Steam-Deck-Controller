use gilrs::{Axis, Gilrs, EventType};
use std::thread;
use tauri::Emitter;

const DEADZONE: f32 = 0.15;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Direction {
    F,
    B,
    L,
    R,
    S,
}

impl Direction {
    fn as_char(&self) -> &'static str {
        match self {
            Direction::F => "F",
            Direction::B => "B",
            Direction::L => "L",
            Direction::R => "R",
            Direction::S => "S",
        }
    }
}

fn get_direction_from_axes(x: f32, y: f32) -> Direction {
    let abs_x = x.abs();
    let abs_y = y.abs();

    if abs_x < DEADZONE && abs_y < DEADZONE {
        return Direction::S;
    }

    if abs_y > abs_x {
        if y < 0.0 {
            Direction::F
        } else {
            Direction::B
        }
    } else {
        if x < 0.0 {
            Direction::L
        } else {
            Direction::R
        }
    }
}

pub fn setup_gamepad_monitor(app: &tauri::App) -> Result<(), String> {
    let app_handle = app.handle().clone();

    // D-32: Use std::thread::spawn (not tauri::async_runtime::spawn)
    // D-33: Clone AppHandle and move into thread (implements Send)
    thread::spawn(move || {
        // D-32: Initialize gilrs inside thread
        let mut gilrs = Gilrs::new().expect("Failed to initialize gilrs");

        // D-11: Track connected Steam gamepad (first one wins)
        let mut connected_gamepad_id: Option<gilrs::GamepadId> = None;
        // D-13, D-41: Direction change guard prevents event spam
        let mut last_direction: Option<Direction> = None;

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
                    EventType::AxisChanged(axis, _, _) => {
                        // D-14: Only process LeftStick axes
                        if (axis == Axis::LeftStickX || axis == Axis::LeftStickY)
                            && connected_gamepad_id.is_some()
                        {
                            let id = connected_gamepad_id.unwrap();
                            let gamepad = gilrs.gamepad(id);

                            let x = gamepad
                                .axis_data(Axis::LeftStickX)
                                .map(|d| d.value())
                                .unwrap_or(0.0);
                            let y = gamepad
                                .axis_data(Axis::LeftStickY)
                                .map(|d| d.value())
                                .unwrap_or(0.0);

                            let new_direction = get_direction_from_axes(x, y);

                            // D-13, D-41: Direction change guard
                            if last_direction != Some(new_direction) {
                                last_direction = Some(new_direction);

                                // D-35: gamepad-direction with { direction: 'F' } (char only)
                                let payload =
                                    serde_json::json!({ "direction": new_direction.as_char() });
                                let _ = app_handle.emit("gamepad-direction", payload);
                            }
                        }
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
