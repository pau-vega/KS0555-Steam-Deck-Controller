use crate::domain::direction::{
    compute_combined, compute_stick_command, compute_trigger, compute_trigger_command,
    compute_trigger_interval, is_dpad_active, is_stick_active, Command, Direction, DpadButtons,
    GamepadInputs, TriggerButtons, DEADZONE, TRIGGER_HEARTBEAT_MAX_MS, TRIGGER_HEARTBEAT_MIN_MS,
    TRIGGER_THRESHOLD,
};
use crate::ports::event_sink::EventSink;
use crate::ports::gamepad::GamepadPort;
use gilrs::{Axis, Button, EventType, Gilrs};
use std::sync::Arc;
use std::time::Instant;

pub struct GilrsGamepad;

impl GilrsGamepad {
    pub fn new() -> Result<Self, String> {
        // gilrs::Gilrs is `!Send`; construction is deferred to `run()`
        // so it happens on the dedicated polling thread.
        Ok(Self)
    }
}

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

fn emit_command(sink: &dyn EventSink, cmd: Command) {
    sink.emit(
        "gamepad-direction",
        serde_json::json!({ "command": format!("{}", cmd) }),
    );
}

fn poll_triggers(
    gamepad: &gilrs::Gamepad,
    sink: &dyn EventSink,
    last_command: &mut Option<Command>,
    last_send_time: &mut Instant,
) {
    let inputs = read_inputs(gamepad);
    if is_dpad_active(&inputs, DEADZONE) || is_stick_active(&inputs, DEADZONE) {
        return;
    }

    let (new_command, r2_pressure, l2_pressure) = compute_trigger_command(&inputs);

    let command_changed = *last_command != Some(new_command);
    let trigger_held = matches!(new_command, Command::Drive { dir: Direction::F, .. });
    let pressure = r2_pressure.max(l2_pressure);
    let interval_ms =
        compute_trigger_interval(pressure, TRIGGER_HEARTBEAT_MIN_MS, TRIGGER_HEARTBEAT_MAX_MS)
            as u128;
    let heartbeat_overdue = trigger_held && last_send_time.elapsed().as_millis() > interval_ms;

    if command_changed || heartbeat_overdue {
        *last_command = Some(new_command);
        *last_send_time = Instant::now();
        emit_command(sink, new_command);
    }
}

impl GamepadPort for GilrsGamepad {
    fn run(self: Box<Self>, sink: Arc<dyn EventSink>) {
        let mut gilrs = Gilrs::new().expect("Failed to initialize gilrs");

        let mut connected_gamepad_id: Option<gilrs::GamepadId> = None;
        let mut last_command: Option<Command> = None;
        let mut last_send_time = Instant::now();

        for (id, gamepad) in gilrs.gamepads() {
            let name = gamepad.name().to_string();
            eprintln!("[gamepad] found on startup: {:?} name={:?}", id, name);
            if connected_gamepad_id.is_none() {
                connected_gamepad_id = Some(id);
                sink.emit("gamepad-connected", serde_json::json!({ "name": name }));
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
                            sink.emit("gamepad-connected", serde_json::json!({ "name": name }));
                        }
                    }
                    EventType::Disconnected if connected_gamepad_id == Some(event.id) => {
                        connected_gamepad_id = None;
                        sink.emit(
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
                                let gamepad = gilrs.gamepad(id);
                                let inputs = read_inputs(&gamepad);
                                let cmd = compute_stick_command(inputs.stick_x, inputs.stick_y);

                                if last_command != Some(cmd) {
                                    last_command = Some(cmd);
                                    last_send_time = Instant::now();
                                    emit_command(sink.as_ref(), cmd);
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
                                let gamepad = gilrs.gamepad(id);
                                let inputs = read_inputs(&gamepad);
                                let cmd = compute_stick_command(inputs.stick_x, inputs.stick_y);

                                if last_command != Some(cmd) {
                                    last_command = Some(cmd);
                                    last_send_time = Instant::now();
                                    emit_command(sink.as_ref(), cmd);
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
                    sink.as_ref(),
                    &mut last_command,
                    &mut last_send_time,
                );
            }

            std::thread::sleep(std::time::Duration::from_millis(8));
        }
    }
}
