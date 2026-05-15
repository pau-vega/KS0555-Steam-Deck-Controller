//! Driven port for BLE communication.
//!
//! The production adapter wraps `btleplug` and owns the `Peripheral`
//! internally; tests substitute a mock that records writes to a `Vec`.

use super::event_sink::EventSink;
use async_trait::async_trait;
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BleConnState {
    Disconnected,
    Connecting,
    Connected,
}

impl BleConnState {
    pub fn as_str(&self) -> &'static str {
        match self {
            BleConnState::Disconnected => "disconnected",
            BleConnState::Connecting => "connecting",
            BleConnState::Connected => "connected",
        }
    }
}

#[async_trait]
pub trait BluetoothPort: Send + Sync {
    async fn connect(&self) -> Result<(), String>;
    async fn write(&self, payload: &[u8]) -> Result<(), String>;
    async fn is_connected(&self) -> bool;
    fn watch_state(&self, sink: Arc<dyn EventSink>);
}
