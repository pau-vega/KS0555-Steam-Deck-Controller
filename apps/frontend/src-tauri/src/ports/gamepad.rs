//! Driven port for the gamepad input source.
//!
//! Implementations own their polling loop and emit `gamepad-direction` /
//! `gamepad-connected` / `gamepad-disconnected` events via the supplied
//! [`EventSink`]. The trait is sync because production polling (gilrs)
//! blocks on `next_event()` and must stay on a `std::thread`.

use super::event_sink::EventSink;
use std::sync::Arc;

pub trait GamepadPort: Send {
    fn run(self: Box<Self>, sink: Arc<dyn EventSink>);
}
