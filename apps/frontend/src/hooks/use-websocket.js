import { useState, useEffect, useCallback, useRef } from "react";
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
export function useWebSocket() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const connect = useCallback(() => {
        const current = wsRef.current;
        if (current?.readyState === WebSocket.OPEN || current?.readyState === WebSocket.CONNECTING)
            return;
        setConnecting(true);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => {
            setConnected(true);
            setConnecting(false);
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
        ws.onclose = () => {
            setConnected(false);
            setConnecting(false);
        };
        ws.onerror = () => {
            setConnected(false);
            setConnecting(false);
        };
    }, []);
    const autoReconnect = useCallback(() => {
        if (!connected && !reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                connect();
            }, 2000);
        }
    }, [connected, connect]);
    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
        }
    }, []);
    useEffect(() => {
        connect();
        return () => {
            const ws = wsRef.current;
            if (ws) {
                ws.onopen = null;
                ws.onclose = null;
                ws.onerror = null;
                ws.close();
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
    }, [connect]);
    return { connected, connecting, send, autoReconnect };
}
