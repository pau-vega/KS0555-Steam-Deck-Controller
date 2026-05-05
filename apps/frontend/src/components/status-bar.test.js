import { jsx as _jsx } from "react/jsx-runtime";
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusBar } from './status-bar';
describe('StatusBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('shows "Backend" label (not "WebSocket")', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: true, gamepadConnected: false }));
        // First child div should be Backend status
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.textContent).toContain('Backend');
        expect(backendPill?.textContent).not.toContain('WebSocket');
    });
    it('shows checkmark when Backend connected', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: true, gamepadConnected: false }));
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.textContent).toContain('✓');
        expect(backendPill?.textContent).toContain('Backend');
    });
    it('shows X when Backend disconnected', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: false, gamepadConnected: false }));
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.textContent).toContain('✗');
        expect(backendPill?.textContent).toContain('Backend');
    });
    it('shows "Connecting..." when connecting', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: false, gamepadConnected: false, connecting: true }));
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.textContent).toContain('Connecting...');
    });
    it('shows Gamepad connected state', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: true, gamepadConnected: true }));
        // Second child div should be Gamepad status
        const gamepadPill = container.firstElementChild?.lastElementChild;
        expect(gamepadPill?.textContent).toContain('✓');
        expect(gamepadPill?.textContent).toContain('Gamepad');
    });
    it('shows Gamepad disconnected state', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: true, gamepadConnected: false }));
        // Second child div should be Gamepad status
        const gamepadPill = container.firstElementChild?.lastElementChild;
        expect(gamepadPill?.textContent).toContain('✗');
        expect(gamepadPill?.textContent).toContain('Gamepad');
    });
    it('applies success color when Backend connected', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: true, gamepadConnected: false }));
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.className).toContain('bg-success');
    });
    it('applies error color when Backend disconnected', () => {
        const { container } = render(_jsx(StatusBar, { wsConnected: false, gamepadConnected: false }));
        const backendPill = container.firstElementChild?.firstElementChild;
        expect(backendPill?.className).toContain('bg-error');
    });
});
