import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGamepad } from './use-gamepad';
function createMockGamepad(axes, id = 'Steam Deck Gamepad') {
    return {
        axes,
        id,
        connected: true,
        timestamp: 0,
        mapping: 'standard',
        index: 0,
        buttons: [],
        hapticActuators: [],
        vibrationActuator: null,
    };
}
describe('useGamepad', () => {
    let originalGetGamepads;
    let originalRAF;
    let rafCallbacks = [];
    beforeEach(() => {
        vi.clearAllMocks();
        rafCallbacks = [];
        // Store original functions
        originalGetGamepads = navigator.getGamepads;
        originalRAF = window.requestAnimationFrame;
        // Mock requestAnimationFrame to capture callbacks
        window.requestAnimationFrame = vi.fn((callback) => {
            rafCallbacks.push(callback);
            return rafCallbacks.length;
        });
        // Mock cancelAnimationFrame
        window.cancelAnimationFrame = vi.fn();
    });
    afterEach(() => {
        navigator.getGamepads = originalGetGamepads;
        window.requestAnimationFrame = originalRAF;
        vi.restoreAllMocks();
    });
    // Helper to simulate RAF callback
    const flushRAF = () => {
        const callbacks = [...rafCallbacks];
        rafCallbacks = [];
        callbacks.forEach((cb) => cb(0));
    };
    it('returns direction S when axes are neutral (within deadzone)', async () => {
        // Mock gamepad with neutral axes (within deadzone of 0.15)
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0, 0])];
        });
        const { result } = renderHook(() => useGamepad());
        // Flush the RAF callback
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('S');
        });
    });
    it('returns direction F when Y axis negative (forward)', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0, -0.5])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('F');
        });
    });
    it('returns direction B when Y axis positive (backward)', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0, 0.5])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('B');
        });
    });
    it('returns direction L when X axis negative (left)', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([-0.5, 0])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('L');
        });
    });
    it('returns direction R when X axis positive (right)', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0.5, 0])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('R');
        });
    });
    it('sets gamepadConnected=true when gamepad present', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0, 0])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.gamepadConnected).toBe(true);
        });
    });
    it('sets gamepadConnected=false when no gamepad', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [null]; // No gamepad connected
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.gamepadConnected).toBe(false);
        });
    });
    it('deadzone: does not change direction for small movements', async () => {
        navigator.getGamepads = vi.fn(() => {
            return [createMockGamepad([0.1, 0.1])];
        });
        const { result } = renderHook(() => useGamepad());
        act(() => {
            flushRAF();
        });
        await waitFor(() => {
            expect(result.current.direction).toBe('S'); // Should stay as Stop
        });
    });
});
