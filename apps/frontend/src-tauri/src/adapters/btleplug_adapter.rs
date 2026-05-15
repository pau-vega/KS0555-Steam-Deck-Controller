use crate::ports::bluetooth::BluetoothPort;
use crate::ports::event_sink::EventSink;
use async_trait::async_trait;
use btleplug::{
    api::{
        Central, CentralEvent, CentralState, Manager as ManagerTrait,
        Peripheral as PeripheralTrait, ScanFilter, WriteType,
    },
    platform::{Adapter, Manager, Peripheral},
};
use futures::stream::StreamExt;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

const BT24_NAME: &str = "BT24";
const BT24_CHAR_UUID: &str = "0000ffe1-0000-1000-8000-00805f9b34fb";
const SCAN_TIMEOUT: Duration = Duration::from_secs(10);

pub struct BtleplugBluetooth {
    peripheral: Mutex<Option<Peripheral>>,
}

impl BtleplugBluetooth {
    pub fn new() -> Self {
        Self {
            peripheral: Mutex::new(None),
        }
    }
}

impl Default for BtleplugBluetooth {
    fn default() -> Self {
        Self::new()
    }
}

async fn find_bt24(adapter: &Adapter) -> Option<Peripheral> {
    if let Ok(peripherals) = adapter.peripherals().await {
        for p in &peripherals {
            if let Ok(Some(props)) = p.properties().await {
                if let Some(name) = &props.local_name {
                    if name.contains(BT24_NAME) {
                        return Some(p.clone());
                    }
                }
            }
        }
    }
    None
}

#[async_trait]
impl BluetoothPort for BtleplugBluetooth {
    async fn connect(&self) -> Result<(), String> {
        let manager = Manager::new()
            .await
            .map_err(|e| format!("Failed to create BLE manager: {}", e))?;
        let adapters = manager
            .adapters()
            .await
            .map_err(|e| format!("Failed to get Bluetooth adapters: {}", e))?;
        let adapter = adapters.into_iter().next().ok_or_else(|| {
            "No Bluetooth adapter found. Ensure Bluetooth is enabled on your Steam Deck."
                .to_string()
        })?;

        let state_info = adapter
            .adapter_state()
            .await
            .map_err(|e| format!("Failed to check Bluetooth state: {}", e))?;
        if state_info != CentralState::PoweredOn {
            return Err(
                "Bluetooth is powered off. Enable Bluetooth in Steam Deck Settings and try again."
                    .to_string(),
            );
        }

        adapter
            .start_scan(ScanFilter::default())
            .await
            .map_err(|e| format!("Failed to start BLE scan: {}", e))?;

        let result = timeout(SCAN_TIMEOUT, async {
            let mut events = adapter
                .events()
                .await
                .map_err(|e| format!("Failed to subscribe to BLE events: {}", e))?;

            loop {
                if let Some(peripheral) = find_bt24(&adapter).await {
                    let _ = adapter.stop_scan().await;
                    peripheral
                        .connect()
                        .await
                        .map_err(|e| format!("Failed to connect to BT24: {}", e))?;
                    peripheral
                        .discover_services()
                        .await
                        .map_err(|e| format!("Failed to discover BT24 services: {}", e))?;
                    let mut guard = self.peripheral.lock().await;
                    *guard = Some(peripheral);
                    return Ok(());
                }

                match timeout(Duration::from_millis(500), events.next()).await {
                    Ok(Some(CentralEvent::DeviceDiscovered(_)))
                    | Ok(Some(CentralEvent::DeviceUpdated(_))) => {}
                    Ok(Some(_)) => continue,
                    Ok(None) => return Err("BLE event stream ended".to_string()),
                    Err(_) => continue,
                }
            }
        })
        .await;

        let _ = adapter.stop_scan().await;

        match result {
            Ok(Ok(())) => Ok(()),
            Ok(Err(e)) => {
                let msg = format!("BT24 connection failed: {}", e);
                eprintln!("[ble] {}", msg);
                Err(msg)
            }
            Err(_) => {
                let msg = format!(
                    "Scan timed out after {} seconds. Ensure the robot is powered on (blue LED blinking) and in range, \
                     then try again. If the issue persists, restart Bluetooth on your Steam Deck.",
                    SCAN_TIMEOUT.as_secs()
                );
                eprintln!("[ble] {}", msg);
                Err(msg)
            }
        }
    }

    async fn write(&self, payload: &[u8]) -> Result<(), String> {
        let guard = self.peripheral.lock().await;
        let peripheral = guard
            .as_ref()
            .ok_or_else(|| "Not connected to BT24 device".to_string())?;

        let chars = peripheral.characteristics();
        let char_uuid =
            uuid::Uuid::parse_str(BT24_CHAR_UUID).map_err(|e| format!("Invalid UUID: {}", e))?;

        let characteristic = chars
            .iter()
            .find(|c| c.uuid == char_uuid)
            .ok_or_else(|| "BT24 characteristic not found".to_string())?;

        peripheral
            .write(characteristic, payload, WriteType::WithoutResponse)
            .await
            .map_err(|e| {
                format!(
                    "Failed to send command '{}': {}",
                    String::from_utf8_lossy(payload),
                    e
                )
            })
    }

    async fn is_connected(&self) -> bool {
        self.peripheral.lock().await.is_some()
    }

    fn watch_state(&self, sink: Arc<dyn EventSink>) {
        tauri::async_runtime::spawn(async move {
            if let Ok(manager) = Manager::new().await {
                if let Ok(adapters) = manager.adapters().await {
                    if let Some(adapter) = adapters.into_iter().next() {
                        if let Ok(adapter_state) = adapter.adapter_state().await {
                            if adapter_state != CentralState::PoweredOn {
                                sink.emit(
                                    "ble-state-changed",
                                    serde_json::json!("disconnected"),
                                );
                                return;
                            }
                        }
                        if let Ok(mut events) = adapter.events().await {
                            while let Some(event) = events.next().await {
                                if let CentralEvent::DeviceDisconnected(_) = event {
                                    sink.emit(
                                        "ble-state-changed",
                                        serde_json::json!("disconnected"),
                                    );
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}
