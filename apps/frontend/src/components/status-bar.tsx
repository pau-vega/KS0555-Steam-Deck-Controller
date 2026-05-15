import { memo } from "react"

interface StatusBarProps {
  bleConnected: boolean
  gamepadConnected: boolean
  connecting?: boolean
}

type BluetoothStatus = "connected" | "connecting" | "disconnected"

function deriveBluetoothStatus(bleConnected: boolean, connecting: boolean | undefined): BluetoothStatus {
  if (bleConnected) return "connected"
  if (connecting) return "connecting"
  return "disconnected"
}

const BLUETOOTH_STATUS_CLASS: Record<BluetoothStatus, string> = {
  connected: "bg-success text-success-text",
  connecting: "bg-connecting text-connecting-text",
  disconnected: "bg-error text-error-text",
}

const BLUETOOTH_STATUS_LABEL: Record<BluetoothStatus, string> = {
  connected: "✓ Bluetooth",
  connecting: "⟳ Connecting...",
  disconnected: "✗ Bluetooth",
}

interface BluetoothBadgeProps {
  status: BluetoothStatus
}

const BluetoothBadge = memo(function BluetoothBadge({ status }: BluetoothBadgeProps) {
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${BLUETOOTH_STATUS_CLASS[status]}`}>
      {BLUETOOTH_STATUS_LABEL[status]}
    </div>
  )
})

interface GamepadBadgeProps {
  connected: boolean
}

const GamepadBadge = memo(function GamepadBadge({ connected }: GamepadBadgeProps) {
  const colorClass = connected ? "bg-success text-success-text" : "bg-error text-error-text"
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>{connected ? "✓" : "✗"} Gamepad</div>
  )
})

export const StatusBar = memo(function StatusBar({ bleConnected, gamepadConnected, connecting }: StatusBarProps) {
  const bluetoothStatus = deriveBluetoothStatus(bleConnected, connecting)

  return (
    <div className="flex gap-4 w-full justify-center">
      <BluetoothBadge status={bluetoothStatus} />
      <GamepadBadge connected={gamepadConnected} />
    </div>
  )
})
