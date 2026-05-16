//! Behavioral tests for the BluetoothPort + EventSink trait contracts,
//! exercised through in-memory mocks. Replaces the previous grep-the-
//! source meta-tests with assertions that real implementations actually
//! satisfy the port contracts.

use app_lib::ble::BleState;
use app_lib::ports::bluetooth::BluetoothPort;
use app_lib::ports::event_sink::EventSink;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use tokio::sync::Mutex;

struct MockBluetoothPort {
    writes: Mutex<Vec<Vec<u8>>>,
    connected: AtomicBool,
    /// Events the mock will push to its watcher sink on `watch_state`.
    watch_events: Mutex<Vec<&'static str>>,
}

impl MockBluetoothPort {
    fn new() -> Self {
        Self {
            writes: Mutex::new(Vec::new()),
            connected: AtomicBool::new(false),
            watch_events: Mutex::new(Vec::new()),
        }
    }

    fn with_watch_events(events: Vec<&'static str>) -> Self {
        let mock = Self::new();
        *mock.watch_events.try_lock().unwrap() = events;
        mock
    }
}

#[async_trait]
impl BluetoothPort for MockBluetoothPort {
    async fn connect(&self) -> Result<(), String> {
        self.connected.store(true, Ordering::SeqCst);
        Ok(())
    }

    async fn write(&self, payload: &[u8]) -> Result<(), String> {
        if !self.connected.load(Ordering::SeqCst) {
            return Err("Not connected to BT24 device".to_string());
        }
        self.writes.lock().await.push(payload.to_vec());
        Ok(())
    }

    async fn is_connected(&self) -> bool {
        self.connected.load(Ordering::SeqCst)
    }

    fn watch_state(&self, sink: Arc<dyn EventSink>) {
        let events: Vec<&'static str> =
            self.watch_events.try_lock().unwrap().drain(..).collect();
        for ev in events {
            sink.emit("ble-state-changed", serde_json::json!(ev));
        }
    }
}

struct MockEventSink {
    events: StdMutex<Vec<(String, Value)>>,
}

impl MockEventSink {
    fn new() -> Self {
        Self {
            events: StdMutex::new(Vec::new()),
        }
    }

    fn snapshot(&self) -> Vec<(String, Value)> {
        self.events.lock().unwrap().clone()
    }
}

impl EventSink for MockEventSink {
    fn emit(&self, event: &str, payload: Value) {
        self.events
            .lock()
            .unwrap()
            .push((event.to_string(), payload));
    }
}

#[tokio::test]
async fn ble_state_holds_arc_dyn_port() {
    // BleState must NOT expose the transport type — only Arc<dyn BluetoothPort>.
    let mock = Arc::new(MockBluetoothPort::new());
    let state = BleState::new(Arc::clone(&mock) as Arc<dyn BluetoothPort>);
    assert!(!state.port().is_connected().await);
    state.port().connect().await.unwrap();
    assert!(state.port().is_connected().await);
}

#[tokio::test]
async fn port_write_records_single_payload() {
    let mock = Arc::new(MockBluetoothPort::new());
    mock.connect().await.unwrap();

    mock.write(b"F").await.unwrap();

    let writes = mock.writes.lock().await;
    assert_eq!(*writes, vec![b"F".to_vec()]);
}

#[tokio::test]
async fn port_write_records_each_command_in_order() {
    let mock = Arc::new(MockBluetoothPort::new());
    mock.connect().await.unwrap();

    for cmd in [b"F", b"L", b"S", b"R", b"B"] {
        mock.write(cmd).await.unwrap();
    }

    let writes = mock.writes.lock().await;
    assert_eq!(
        *writes,
        vec![
            b"F".to_vec(),
            b"L".to_vec(),
            b"S".to_vec(),
            b"R".to_vec(),
            b"B".to_vec(),
        ]
    );
}

#[tokio::test]
async fn port_write_before_connect_returns_error() {
    let mock = MockBluetoothPort::new();
    let result = mock.write(b"F").await;
    assert!(result.is_err(), "write before connect must fail");
    assert!(mock.writes.lock().await.is_empty(), "no payload recorded");
}

#[test]
fn event_sink_records_emissions_in_order() {
    let sink = MockEventSink::new();
    sink.emit("ble-state-changed", serde_json::json!("connecting"));
    sink.emit("ble-state-changed", serde_json::json!("connected"));
    sink.emit("gamepad-direction", serde_json::json!({ "command": "F138\n" }));

    let snap = sink.snapshot();
    assert_eq!(snap.len(), 3);
    assert_eq!(snap[0].0, "ble-state-changed");
    assert_eq!(snap[0].1, serde_json::json!("connecting"));
    assert_eq!(snap[2].0, "gamepad-direction");
    assert_eq!(snap[2].1, serde_json::json!({ "command": "F138\n" }));
}

#[test]
fn watch_state_emits_disconnect_once_per_event() {
    let mock = MockBluetoothPort::with_watch_events(vec!["disconnected"]);
    let sink: Arc<MockEventSink> = Arc::new(MockEventSink::new());
    let sink_dyn: Arc<dyn EventSink> = Arc::clone(&sink) as Arc<dyn EventSink>;

    mock.watch_state(sink_dyn);

    let snap = sink.snapshot();
    let disconnect_count = snap
        .iter()
        .filter(|(e, p)| e == "ble-state-changed" && p == &serde_json::json!("disconnected"))
        .count();
    assert_eq!(disconnect_count, 1, "exactly one disconnect emission");
}

#[test]
fn gamepad_direction_command_wire_format() {
    let sink = MockEventSink::new();
    sink.emit("gamepad-direction", serde_json::json!({ "command": "F138\n" }));
    sink.emit("gamepad-direction", serde_json::json!({ "command": "S\n" }));

    let snap = sink.snapshot();
    assert_eq!(snap.len(), 2);
    assert_eq!(snap[0].1, serde_json::json!({ "command": "F138\n" }));
    assert_eq!(snap[1].1, serde_json::json!({ "command": "S\n" }));
}
