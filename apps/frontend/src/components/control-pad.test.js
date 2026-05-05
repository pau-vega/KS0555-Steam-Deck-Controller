import { jsx as _jsx } from "react/jsx-runtime";
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ControlPad } from './control-pad';
describe('ControlPad', () => {
    let mockOnCommand;
    beforeEach(() => {
        vi.clearAllMocks();
        mockOnCommand = vi.fn();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('renders all 5 control buttons', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Use within to scope queries to this render
        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(5);
    });
    it('calls onCommand with "F" when forward button clicked', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Find button by its grid-area style (Forward is at 1/2)
        const forwardButton = container.querySelector('button[style*="1 / 2"]');
        expect(forwardButton).toBeInTheDocument();
        fireEvent.click(forwardButton);
        expect(mockOnCommand).toHaveBeenCalledWith('F');
    });
    it('calls onCommand with "B" when backward button clicked', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Backward is at 3/2
        const backwardButton = container.querySelector('button[style*="3 / 2"]');
        expect(backwardButton).toBeInTheDocument();
        fireEvent.click(backwardButton);
        expect(mockOnCommand).toHaveBeenCalledWith('B');
    });
    it('calls onCommand with "L" when left button clicked', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Left is at 2/1
        const leftButton = container.querySelector('button[style*="2 / 1"]');
        expect(leftButton).toBeInTheDocument();
        fireEvent.click(leftButton);
        expect(mockOnCommand).toHaveBeenCalledWith('L');
    });
    it('calls onCommand with "R" when right button clicked', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Right is at 2/3
        const rightButton = container.querySelector('button[style*="2 / 3"]');
        expect(rightButton).toBeInTheDocument();
        fireEvent.click(rightButton);
        expect(mockOnCommand).toHaveBeenCalledWith('R');
    });
    it('calls onCommand with "S" when stop button clicked', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        // Stop is at 2/2 and has bg-error class
        const stopButton = container.querySelector('button.bg-error');
        expect(stopButton).toBeInTheDocument();
        fireEvent.click(stopButton);
        expect(mockOnCommand).toHaveBeenCalledWith('S');
    });
    it('buttons are disabled when disabled prop is true', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: true }));
        const buttons = container.querySelectorAll('button');
        buttons.forEach(button => {
            expect(button).toBeDisabled();
        });
    });
    it('Stop button has distinct styling (bg-error class)', () => {
        const { container } = render(_jsx(ControlPad, { onCommand: mockOnCommand, disabled: false }));
        const stopButton = container.querySelector('button.bg-error');
        expect(stopButton).toBeInTheDocument();
        expect(stopButton?.textContent).toBe('■');
    });
});
