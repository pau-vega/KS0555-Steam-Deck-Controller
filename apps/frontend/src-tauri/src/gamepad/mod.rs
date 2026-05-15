use gilrs::{Axis, Button, EventType, Gilrs};
use std::thread;
use std::time::Instant;
use tauri::Emitter;

const DEADZONE: f32 = 0.15;
const TRIGGER_THRESHOLD: f32 = 0.1;
const TRIGGER_HEARTBEAT_MIN_MS: u64 = 30;
const TRIGGER_HEARTBEAT_MAX_MS: u64 = 400;

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

fn lateral_only(d: Direction) -> Direction {
    match d {
        Direction::L | Direction::R => d,
        _ => Direction::S,
    }
}

fn compute_direction(gamepad: &gilrs::Gamepad) -> Direction {
    let dpad_x = gamepad
        .axis_data(Axis::DPadX)
        .map(|d| d.value())
        .unwrap_or(0.0);
    let dpad_y = gamepad
        .axis_data(Axis::DPadY)
        .map(|d| d.value())
        .unwrap_or(0.0);

    let dpad_up = gamepad.is_pressed(Button::DPadUp);
    let dpad_down = gamepad.is_pressed(Button::DPadDown);
    let dpad_left = gamepad.is_pressed(Button::DPadLeft);
    let dpad_right = gamepad.is_pressed(Button::DPadRight);

    let dpad_button_x = if dpad_right {
        1.0
    } else if dpad_left {
        -1.0
    } else {
        0.0
    };
    let dpad_button_y = if dpad_down {
        1.0
    } else if dpad_up {
        -1.0
    } else {
        0.0
    };

    let eff_x = if dpad_x.abs() > DEADZONE {
        dpad_x
    } else {
        dpad_button_x
    };
    let eff_y = if dpad_y.abs() > DEADZONE {
        dpad_y
    } else {
        dpad_button_y
    };

    let dpad_active = eff_x.abs() > DEADZONE
        || eff_y.abs() > DEADZONE
        || dpad_up
        || dpad_down
        || dpad_left
        || dpad_right;

    if dpad_active {
        lateral_only(get_direction_from_axes(eff_x, eff_y))
    } else {
        let stick_x = gamepad
            .axis_data(Axis::LeftStickX)
            .map(|d| d.value())
            .unwrap_or(0.0);
        let stick_y = gamepad
            .axis_data(Axis::LeftStickY)
            .map(|d| d.value())
            .unwrap_or(0.0);
        lateral_only(get_direction_from_axes(stick_x, stick_y))
    }
}

fn compute_trigger_direction(gamepad: &gilrs::Gamepad) -> (Direction, f32, f32) {
    let r2 = gamepad
        .axis_data(Axis::RightZ)
        .map(|d| d.value())
        .unwrap_or(0.0);
    let l2 = gamepad
        .axis_data(Axis::LeftZ)
        .map(|d| d.value())
        .unwrap_or(0.0);

    let r2_pressure = if r2 > TRIGGER_THRESHOLD {
        r2 - TRIGGER_THRESHOLD
    } else {
        0.0
    };
    let l2_pressure = if l2 > TRIGGER_THRESHOLD {
        l2 - TRIGGER_THRESHOLD
    } else {
        0.0
    };

    // Fallback for digital-only triggers (no analog axis): use button state
    let (r2_eff, l2_eff) = if r2_pressure == 0.0 && l2_pressure == 0.0 {
        let r2_btn =
            gamepad.is_pressed(Button::RightTrigger2) || gamepad.is_pressed(Button::RightTrigger);
        let l2_btn =
            gamepad.is_pressed(Button::LeftTrigger2) || gamepad.is_pressed(Button::LeftTrigger);
        if r2_btn || l2_btn {
            (
                if r2_btn { 1.0 } else { 0.0 },
                if l2_btn { 1.0 } else { 0.0 },
            )
        } else {
            (0.0, 0.0)
        }
    } else {
        (r2_pressure, l2_pressure)
    };

    let direction = if r2_eff > 0.0 && r2_eff >= l2_eff {
        Direction::F
    } else if l2_eff > 0.0 {
        Direction::B
    } else {
        Direction::S
    };

    (direction, r2_eff, l2_eff)
}

fn compute_combined_direction(gamepad: &gilrs::Gamepad) -> Direction {
    if is_dpad_active(gamepad) || is_stick_active(gamepad) {
        compute_direction(gamepad)
    } else {
        let (d, _, _) = compute_trigger_direction(gamepad);
        d
    }
}

fn compute_trigger_interval(pressure: f32) -> u64 {
    if pressure <= 0.0 {
        return TRIGGER_HEARTBEAT_MAX_MS;
    }
    let t = pressure.min(0.9) / 0.9;
    let interval = TRIGGER_HEARTBEAT_MIN_MS as f32
        + (1.0 - t) * (TRIGGER_HEARTBEAT_MAX_MS - TRIGGER_HEARTBEAT_MIN_MS) as f32;
    interval as u64
}

fn is_dpad_active(gamepad: &gilrs::Gamepad) -> bool {
    let dpad_x = gamepad
        .axis_data(Axis::DPadX)
        .map(|d| d.value())
        .unwrap_or(0.0);
    gamepad.is_pressed(Button::DPadLeft) || gamepad.is_pressed(Button::DPadRight) || dpad_x.abs() > DEADZONE
}

fn is_stick_active(gamepad: &gilrs::Gamepad) -> bool {
    let x = gamepad
        .axis_data(Axis::LeftStickX)
        .map(|d| d.value())
        .unwrap_or(0.0);
    x.abs() > DEADZONE
}

fn poll_triggers(
    gamepad: &gilrs::Gamepad,
    app_handle: &tauri::AppHandle,
    last_direction: &mut Option<Direction>,
    last_send_time: &mut Instant,
) {
    if is_dpad_active(gamepad) || is_stick_active(gamepad) {
        return;
    }

    let (new_direction, r2_pressure, l2_pressure) = compute_trigger_direction(gamepad);

    let direction_changed = *last_direction != Some(new_direction);
    let trigger_held = matches!(new_direction, Direction::F | Direction::B);
    let pressure = r2_pressure.max(l2_pressure);
    let interval_ms = compute_trigger_interval(pressure) as u128;
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
                                let new_direction =
                                    compute_combined_direction(&gilrs.gamepad(id));

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
                                let new_direction =
                                    compute_combined_direction(&gilrs.gamepad(id));

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

// ── Unit Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deadzone_returns_stop() {
        assert_eq!(get_direction_from_axes(0.0, 0.0), Direction::S);
        assert_eq!(get_direction_from_axes(0.1, 0.1), Direction::S);
        assert_eq!(get_direction_from_axes(-0.14, 0.14), Direction::S);
    }

    #[test]
    fn test_up_is_forward() {
        assert_eq!(get_direction_from_axes(0.0, -1.0), Direction::F);
        assert_eq!(get_direction_from_axes(-0.3, -0.8), Direction::F);
    }

    #[test]
    fn test_down_is_backward() {
        assert_eq!(get_direction_from_axes(0.0, 1.0), Direction::B);
        assert_eq!(get_direction_from_axes(0.3, 0.8), Direction::B);
    }

    #[test]
    fn test_left_is_left() {
        assert_eq!(get_direction_from_axes(-1.0, 0.0), Direction::L);
        assert_eq!(get_direction_from_axes(-1.0, 0.2), Direction::L);
    }

    #[test]
    fn test_right_is_right() {
        assert_eq!(get_direction_from_axes(1.0, 0.0), Direction::R);
        assert_eq!(get_direction_from_axes(1.0, -0.2), Direction::R);
    }

    #[test]
    fn test_deadzone_edge_cases() {
        assert_eq!(get_direction_from_axes(0.149, 0.0), Direction::S);
        assert_eq!(get_direction_from_axes(0.0, -0.149), Direction::S);
    }

    #[test]
    fn test_strong_x_overrides_weak_y() {
        assert_eq!(get_direction_from_axes(0.8, 0.1), Direction::R);
        assert_eq!(get_direction_from_axes(-0.8, -0.1), Direction::L);
    }

    #[test]
    fn test_strong_y_overrides_weak_x() {
        assert_eq!(get_direction_from_axes(0.1, -0.8), Direction::F);
        assert_eq!(get_direction_from_axes(-0.1, 0.8), Direction::B);
    }
}
