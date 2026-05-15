use crate::ports::bluetooth::BluetoothPort;
use std::sync::Arc;

pub struct BleState {
    inner: Arc<dyn BluetoothPort>,
}

impl BleState {
    pub fn new(port: Arc<dyn BluetoothPort>) -> Self {
        Self { inner: port }
    }

    pub fn port(&self) -> &Arc<dyn BluetoothPort> {
        &self.inner
    }
}

impl Clone for BleState {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }
}
