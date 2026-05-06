pub mod state;
pub use state::BleState;
use btleplug::{
    api::{Central, CentralEvent, Manager as ManagerTrait, Peripheral as PeripheralTrait, ScanFilter},
    platform::{Adapter, Manager, Peripheral},
};
use tauri::{AppHandle, Emitter, Manager as TauriManager};
use tokio::time::{timeout, Duration};
use futures::stream::StreamExt;

const BT24_SERVICE_UUID: &str = "0000ffe0-0000-1000-8000-00805f9b34fb";
const BT24_NAME: &str = "BT24";
const SCAN_TIMEOUT: Duration = Duration::from_secs(5);

#[tauri::command]
pub async fn ble_connect(app: AppHandle, state: tauri::State<'_, BleState>) -> Result<(), String> {
    // Emit "connecting" state
    app.emit("ble-state-changed", "connecting")
        .map_err(|e| format!("Failed to emit connecting state: {}", e))?;

    // Get manager and adapters
    let manager = Manager::new().await
        .map_err(|e| format!("Failed to create manager: {}", e))?;
    let adapters = manager.adapters().await
        .map_err(|e| format!("Failed to get adapters: {}", e))?;
    let adapter = adapters.into_iter().next()
        .ok_or_else(|| "No Bluetooth adapter found".to_string())?;

    // Start scan with timeout (D-03: 5 seconds)
    adapter.start_scan(ScanFilter::default()).await
        .map_err(|e| format!("Failed to start scan: {}", e))?;

    let result = timeout(SCAN_TIMEOUT, async {
        // Subscribe to events for device discovery
        let mut events = adapter.events().await
            .map_err(|e| format!("Failed to get events: {}", e))?;
                        while let Some(event) = events.next().await {
            if let CentralEvent::DeviceDiscovered(device_id) = event {
                // Get peripheral by device ID
                let peripherals = adapter.peripherals().await
                    .map_err(|e| format!("Failed to get peripherals: {}", e))?;

                // Find BT24 device - check each peripheral's properties
                let mut found_peripheral = None;
                for p in peripherals {
                    if let Ok(Some(props)) = p.properties().await {
                        if let Some(name) = &props.local_name {
                            if name.contains(BT24_NAME) {
                                found_peripheral = Some(p);
                                break;
                            }
                        }
                    }
                }

                if let Some(peripheral) = found_peripheral {
                    // Stop scan and connect
                    let _ = adapter.stop_scan().await;
                    peripheral.connect().await
                        .map_err(|e| format!("Connect failed: {}", e))?;

                    // Store in managed state (D-05)
                    state.set(Some(peripheral));

                    // Emit "connected" state
                    app.emit("ble-state-changed", "connected")
                        .map_err(|e| format!("Failed to emit connected: {}", e))?;
                    return Ok(());
                }
            }
        }
        Err("Scan timeout".to_string())
    }).await;

    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => Err(e),
        Err(_) => {
            let _ = adapter.stop_scan().await;
            Err("Scan timeout: BT24 device not found within 5 seconds".to_string())
        }
    }
}

pub fn setup_event_listener(app: AppHandle, state: BleState) {
    tauri::async_runtime::spawn(async move {
        // Get manager and adapter
        if let Ok(manager) = Manager::new().await {
            if let Ok(adapters) = manager.adapters().await {
                if let Some(adapter) = adapters.into_iter().next() {
                    if let Ok(mut events) = adapter.events().await {
                        while let Some(event) = events.next().await {
                            if let CentralEvent::DeviceDisconnected(_) = event {
                                // Auto-emit disconnected (BLE-05)
                                let _ = app.emit("ble-state-changed", "disconnected");
                                // D-01: Auto-reconnect with backoff would go here
                            }
                        }
                    }
                }
            }
        }
    });
}

const BT24_CHAR_UUID: &str = "0000ffe1-0000-1000-8000-00805f9b34fb";

#[tauri::command]
pub async fn ble_disconnect(
    app: AppHandle,
    state: tauri::State<'_, BleState>,
) -> Result<(), String> {
    match state.get() {
        Some(peripheral) => {
            // Disconnect from peripheral
            peripheral.disconnect().await
                .map_err(|e| format!("Failed to disconnect: {}", e))?;

            // Clear state
            state.set(None);

            // Emit disconnected event (BLE-02)
            app.emit("ble-state-changed", "disconnected")
                .map_err(|e| format!("Failed to emit disconnected: {}", e))?;

            Ok(())
        }
        None => Err("Not connected to any device".to_string()),
    }
}

#[tauri::command]
pub async fn ble_send(
    app: AppHandle,
    state: tauri::State<'_, BleState>,
    command: String,
) -> Result<(), String> {
    // Validate command is a single character (F/B/L/R/S)
    if command.len() != 1 {
        return Err(format!("Invalid command: '{}'. Must be single char (F/B/L/R/S)", command));
    }

    let peripheral = state.get()
        .ok_or_else(|| "Not connected to BT24 device".to_string())?;

    // Discover services to find characteristic
    peripheral.discover_services().await
        .map_err(|e| format!("Failed to discover services: {}", e))?;

    // Find the BT24 characteristic
    let chars = peripheral.characteristics();
    let char_uuid = uuid::Uuid::parse_str(BT24_CHAR_UUID)
        .map_err(|e| format!("Invalid UUID: {}", e))?;

    let characteristic = chars.iter()
        .find(|c| c.uuid == char_uuid)
        .ok_or_else(|| "BT24 characteristic not found".to_string())?;

    // Convert command to bytes
    let data = command.as_bytes().to_vec();

    // Write to characteristic using WithoutResponse (D-02)
    peripheral.write(&characteristic, &data, btleplug::api::WriteType::WithoutResponse).await
        .map_err(|e| format!("Failed to send command '{}': {}", command, e))?;

    Ok(())
}
