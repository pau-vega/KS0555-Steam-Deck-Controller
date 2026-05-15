use crate::ports::event_sink::EventSink;
use crate::ports::gamepad::GamepadPort;
use std::sync::Arc;
use std::thread;

pub fn setup_gamepad_monitor(
    port: Box<dyn GamepadPort>,
    sink: Arc<dyn EventSink>,
) -> Result<(), String> {
    thread::spawn(move || port.run(sink));
    Ok(())
}
