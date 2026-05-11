interface StatusBarProps {
  bleConnected: boolean
  gamepadConnected: boolean
  connecting?: boolean
}

export function StatusBar({ bleConnected, gamepadConnected, connecting }: StatusBarProps) {
  const isBluetoothConnecting = connecting && !bleConnected

  return (
    <div className="flex gap-4 w-full justify-center">
      <div
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          bleConnected
            ? "bg-success text-success-text"
            : isBluetoothConnecting
              ? "bg-connecting text-connecting-text"
              : "bg-error text-error-text"
        }`}
      >
        {bleConnected ? "✓ Bluetooth" : isBluetoothConnecting ? "⟳ Connecting..." : "✗ Bluetooth"}
      </div>
      <div
        className={`px-3 py-1 rounded-full text-sm font-medium ${gamepadConnected ? "bg-success text-success-text" : "bg-error text-error-text"}`}
      >
        {gamepadConnected ? "✓" : "✗"} Gamepad
      </div>
    </div>
  )
}
