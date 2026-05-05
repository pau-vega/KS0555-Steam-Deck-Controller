import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusBar({ wsConnected, gamepadConnected, connecting }) {
    const isBackendConnecting = connecting && !wsConnected;
    return (_jsxs("div", { className: "flex gap-4 w-full justify-center", children: [_jsx("div", { className: `px-3 py-1 rounded-full text-sm font-medium ${wsConnected ? 'bg-success text-success-text' :
                    isBackendConnecting ? 'bg-yellow-600 text-yellow-100' :
                        'bg-error text-error-text'}`, children: wsConnected ? '✓ Backend' : isBackendConnecting ? '⟳ Connecting...' : '✗ Backend' }), _jsxs("div", { className: `px-3 py-1 rounded-full text-sm font-medium ${gamepadConnected ? 'bg-success text-success-text' : 'bg-error text-error-text'}`, children: [gamepadConnected ? '✓' : '✗', " Gamepad"] })] }));
}
