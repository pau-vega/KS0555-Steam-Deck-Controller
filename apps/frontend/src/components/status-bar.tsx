interface StatusBarProps {
  wsConnected: boolean;
  gamepadConnected: boolean;
  connecting?: boolean;
}

export function StatusBar({ wsConnected, gamepadConnected, connecting }: StatusBarProps) {
  const isBackendConnecting = connecting && !wsConnected;

  return (
    <div className="flex gap-4 w-full justify-center">
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
        wsConnected ? 'bg-success text-success-text' :
        isBackendConnecting ? 'bg-yellow-600 text-yellow-100' :
        'bg-error text-error-text'
      }`}>
        {wsConnected ? '✓ Backend' : isBackendConnecting ? '⟳ Connecting...' : '✗ Backend'}
      </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${gamepadConnected ? 'bg-success text-success-text' : 'bg-error text-error-text'}`}>
        {gamepadConnected ? '✓' : '✗'} Gamepad
      </div>
    </div>
  );
}
