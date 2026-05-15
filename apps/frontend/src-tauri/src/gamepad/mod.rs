use crate::domain::direction::{
    compute_combined, compute_trigger, compute_trigger_interval, is_dpad_active, is_stick_active,
    Direction, DpadButtons, GamepadInputs, TriggerButtons, DEADZONE, TRIGGER_HEARTBEAT_MAX_MS,
    TRIGGER_HEARTBEAT_MIN_MS, TRIGGER_THRESHOLD,
};
use gilrs::{Axis, Button, EventType, Gilrs};
use std::thread;
use std::time::Instant;
use tauri::Emitter;

fn read_inputs(gamepad: &gilrs::Gamepad) -> GamepadInputs {
    GamepadInputs {
        stick_x: gamepad.axis_data(Axis::LeftStickX).map(|d| d.value()).unwrap_or(0.0),
        stick_y: gamepad.axis_data(Axis::LeftStickY).map(|d| d.value()).unwrap_or(0.0),
        dpad_x: gamepad.axis_data(Axis::DPadX).map(|d| d.value()).unwrap_or(0.0),
        dpad_y: gamepad.axis_data(Axis::DPadY).map(|d| d.value()).unwrap_or(0.0),
        r2: gamepad.axis_data(Axis::RightZ).map(|d| d.value()).unwrap_or(0.0),
        l2: gamepad.axis_data(Axis::LeftZ).map(|d| d.value()).unwrap_or(0.0),
        dpad_buttons: DpadButtons {
            up: gamepad.is_pressed(Button::DPadUp),
            down: gamepad.is_pressed(Button::DPadDown),
            left: gamepad.is_pressed(Button::DPadLeft),
            right: gamepad.is_pressed(Button::DPadRight),
        },
        trigger_buttons: TriggerButtons {
            r1: gamepad.is_pressed(Button::RightTrigger),
            r2: gamepad.is_pressed(Button::RightTrigger2),
            l1: gamepad.is_pressed(Button::LeftTrigger),
            l2: gamepad.is_pressed(Button::LeftTrigger2),
        },
    }
}

fn poll_triggers(
    gamepad: &gilrs::Gamepad,
    app_handle: &tauri::AppHandle,
    last_direction: &mut Option<Direction>,
    last_send_time: &mut Instant,
) {
    let inputs = read_inputs(gamepad);
    if is_dpad_active(&inputs, DEADZONE) || is_stick_active(&inputs, DEADZONE) {
        return;
    }

    let (new_direction, r2_pressure, l2_pressure) = compute_trigger(&inputs, TRIGGER_THRESHOLD);

    let direction_changed = *last_direction != Some(new_direction);
    let trigger_held = matches!(new_direction, Direction::F | Direction::B);
    let pressure = r2_pressure.max(l2_pressure);
    let interval_ms =
        compute_trigger_interval(pressure, TRIGGER_HEARTBEAT_MIN_MS, TRIGGER_HEARTBEAT_MAX_MS)
            as u128;
    let heartbeat_overdue = trigger_held && last_send_time.elapsed().as_millis() > interval_ms;

    if direction_changed || heartbeat_overdue {
        *last_direction = Some(new_direction);
        *last_send_time = Instant::now();
        let payload = serde_json::json!({ "direction": new_direction.as_char() });
        let _ = app_handle.emit("gamepad-direction", payload);
    }
}

pub fn setup_gamepad_monitor(app: &tauri::App) -> Result<(), String> {
    let app_handle = app.handle().clone();

    thread::spawn(move || {
        let mut gilrs = Gilrs::new().expect("Failed to initialize gilrs");

        let mut connected_gamepad_id: Option<gilrs::GamepadId> = None;
        let mut last_direction: Option<Direction> = None;
        let mut last_send_time = Instant::now();

        for (id, gamepad) in gilrs.gamepads() {
            let name = gamepad.name().to_string();
            eprintln!("[gamepad] found on startup: {:?} name={:?}", id, name);
            if connected_gamepad_id.is_none() {
                connected_gamepad_id = Some(id);
                let _ = app_handle.emit("gamepad-connected", serde_json::json!({ "name": name }));
            }
        }
        if connected_gamepad_id.is_none() {
            eprintln!("[gamepad] no gamepads found on startup — waiting for connect events");
        }

        loop {
            while let Some(event) = gilrs.next_event() {
                match event.event {
                    EventType::Connected => {
                        let gamepad = gilrs.gamepad(event.id);
                        let name = gamepad.name().to_string();

                        if connected_gamepad_id.is_none() {
                            connected_gamepad_id = Some(event.id);

                            let _ = app_handle
                                .emit("gamepad-connected", serde_json::json!({ "name": name }));
                        }
                    }
                    EventType::Disconnected if connected_gamepad_id == Some(event.id) => {
                        connected_gamepad_id = None;

                        let _ = app_handle.emit(
                            "gamepad-disconnected",
                            serde_json::json!({ "name": "controller" }),
                        );
                    }
                    EventType::AxisChanged(axis, _value, _) => {
                        let is_stick = axis == Axis::LeftStickX || axis == Axis::LeftStickY;
                        let is_dpad_axis = axis == Axis::DPadX || axis == Axis::DPadY;
                        let is_trigger_axis = axis == Axis::RightZ || axis == Axis::LeftZ;

                        if is_stick || is_dpad_axis || is_trigger_axis {
                            if let Some(id) = connected_gamepad_id {
                                let inputs = read_inputs(&gilrs.gamepad(id));
                                let new_direction = compute_combined(&inputs, DEADZONE);

                                if last_direction != Some(new_direction) {
                                    last_direction = Some(new_direction);
                                    last_send_time = Instant::now();

                                    let payload = serde_json::json!(
                                        { "direction": new_direction.as_char() }
                                    );
                                    let _ = app_handle.emit("gamepad-direction", payload);
                                }
                            }
                        }
                    }
                    EventType::ButtonChanged(button, _, _)
                    | EventType::ButtonPressed(button, _)
                    | EventType::ButtonReleased(button, _) => {
                        let is_trigger = matches!(
                            button,
                            Button::RightTrigger
                                | Button::RightTrigger2
                                | Button::LeftTrigger
                                | Button::LeftTrigger2
                        );
                        if button.is_dpad() || is_trigger {
                            if let Some(id) = connected_gamepad_id {
                                let inputs = read_inputs(&gilrs.gamepad(id));
                                let new_direction = compute_combined(&inputs, DEADZONE);

                                if last_direction != Some(new_direction) {
                                    last_direction = Some(new_direction);
                                    last_send_time = Instant::now();

                                    let payload = serde_json::json!(
                                        { "direction": new_direction.as_char() }
                                    );
                                    let _ = app_handle.emit("gamepad-direction", payload);
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }

            if let Some(id) = connected_gamepad_id {
                poll_triggers(
                    &gilrs.gamepad(id),
                    &app_handle,
                    &mut last_direction,
                    &mut last_send_time,
                );
            }

            std::thread::sleep(std::time::Duration::from_millis(8));
        }
    });

    Ok(())
}
