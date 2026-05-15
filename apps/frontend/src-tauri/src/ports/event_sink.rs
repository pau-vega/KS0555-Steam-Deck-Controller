//! Driven port for emitting events to whoever's listening
//! (Tauri webview in prod; an in-memory recorder in tests).

use serde_json::Value;

pub trait EventSink: Send + Sync {
    fn emit(&self, event: &str, payload: Value);
}
