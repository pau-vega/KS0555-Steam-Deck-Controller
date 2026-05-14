import type { Mock } from "vitest"

import { render, screen, fireEvent, within, cleanup } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import type { Direction } from "../types"

import { ControlPad } from "./control-pad"

const { mockToggleInvert } = vi.hoisted(() => ({
  mockToggleInvert: vi.fn(),
}))

vi.mock("../hooks/use-invert-controls", () => ({
  useInvertControls: vi.fn(() => ({
    inverted: false,
    toggleInvert: mockToggleInvert,
  })),
}))

describe("ControlPad", () => {
  let mockOnCommand: Mock<(command: Direction) => void>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockOnCommand = vi.fn()
    const { useInvertControls } = await import("../hooks/use-invert-controls")
    vi.mocked(useInvertControls).mockReturnValue({
      inverted: false,
      toggleInvert: mockToggleInvert,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders all 5 control buttons plus toggle button", () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Use within to scope queries to this render
    const buttons = container.querySelectorAll("button")
    expect(buttons).toHaveLength(6)
  })

  it('calls onCommand with "F" when forward button clicked', () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Find button by its grid-area style (Forward is at 1/2)
    const forwardButton = container.querySelector('button[style*="1 / 2"]')
    expect(forwardButton).toBeInTheDocument()

    fireEvent.click(forwardButton!)
    expect(mockOnCommand).toHaveBeenCalledWith("F")
  })

  it('calls onCommand with "B" when backward button clicked', () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Backward is at 3/2
    const backwardButton = container.querySelector('button[style*="3 / 2"]')
    expect(backwardButton).toBeInTheDocument()

    fireEvent.click(backwardButton!)
    expect(mockOnCommand).toHaveBeenCalledWith("B")
  })

  it('calls onCommand with "L" when left button clicked', () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Left is at 2/1
    const leftButton = container.querySelector('button[style*="2 / 1"]')
    expect(leftButton).toBeInTheDocument()

    fireEvent.click(leftButton!)
    expect(mockOnCommand).toHaveBeenCalledWith("L")
  })

  it('calls onCommand with "R" when right button clicked', () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Right is at 2/3
    const rightButton = container.querySelector('button[style*="2 / 3"]')
    expect(rightButton).toBeInTheDocument()

    fireEvent.click(rightButton!)
    expect(mockOnCommand).toHaveBeenCalledWith("R")
  })

  it('calls onCommand with "S" when stop button clicked', () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    // Stop is at 2/2 and has bg-error class
    const stopButton = container.querySelector("button.bg-error")
    expect(stopButton).toBeInTheDocument()

    fireEvent.click(stopButton!)
    expect(mockOnCommand).toHaveBeenCalledWith("S")
  })

  it("buttons are disabled when disabled prop is true", () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={true} />)

    const buttons = container.querySelectorAll("button")
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it("Stop button has distinct styling (bg-error class)", () => {
    const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

    const stopButton = container.querySelector("button.bg-error")
    expect(stopButton).toBeInTheDocument()
    expect(stopButton?.textContent).toBe("■")
  })

  describe("inversion", () => {
    it("inverted=true: forward (▲) sends B", async () => {
      const { useInvertControls } = await import("../hooks/use-invert-controls")
      vi.mocked(useInvertControls).mockReturnValue({
        inverted: true,
        toggleInvert: mockToggleInvert,
      })

      const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const forwardButton = container.querySelector('button[style*="1 / 2"]')
      fireEvent.click(forwardButton!)
      expect(mockOnCommand).toHaveBeenCalledWith("B")
    })

    it("inverted=true: backward (▼) sends F", async () => {
      const { useInvertControls } = await import("../hooks/use-invert-controls")
      vi.mocked(useInvertControls).mockReturnValue({
        inverted: true,
        toggleInvert: mockToggleInvert,
      })

      const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const backwardButton = container.querySelector('button[style*="3 / 2"]')
      fireEvent.click(backwardButton!)
      expect(mockOnCommand).toHaveBeenCalledWith("F")
    })

    it("inverted=true: left (◀), stop (■), right (▶) unchanged", async () => {
      const { useInvertControls } = await import("../hooks/use-invert-controls")
      vi.mocked(useInvertControls).mockReturnValue({
        inverted: true,
        toggleInvert: mockToggleInvert,
      })

      const { container } = render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const leftButton = container.querySelector('button[style*="2 / 1"]')
      const stopButton = container.querySelector("button.bg-error")
      const rightButton = container.querySelector('button[style*="2 / 3"]')

      fireEvent.click(leftButton!)
      expect(mockOnCommand).toHaveBeenCalledWith("L")

      fireEvent.click(stopButton!)
      expect(mockOnCommand).toHaveBeenCalledWith("S")

      fireEvent.click(rightButton!)
      expect(mockOnCommand).toHaveBeenCalledWith("R")
    })

    it("toggle button exists and shows inverted state", async () => {
      const { useInvertControls } = await import("../hooks/use-invert-controls")
      vi.mocked(useInvertControls).mockReturnValue({
        inverted: true,
        toggleInvert: mockToggleInvert,
      })

      render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const toggleButton = screen.getByLabelText("Invert forward/backward controls")
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute("aria-pressed", "true")
    })

    it("toggle button shows normal state when not inverted", async () => {
      const { useInvertControls } = await import("../hooks/use-invert-controls")
      vi.mocked(useInvertControls).mockReturnValue({
        inverted: false,
        toggleInvert: mockToggleInvert,
      })

      render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const toggleButton = screen.getByLabelText("Invert forward/backward controls")
      expect(toggleButton).toHaveAttribute("aria-pressed", "false")
    })

    it("clicking toggle button calls toggleInvert", async () => {
      render(<ControlPad onCommand={mockOnCommand} disabled={false} />)

      const toggleButton = screen.getByLabelText("Invert forward/backward controls")
      fireEvent.click(toggleButton)
      expect(mockToggleInvert).toHaveBeenCalled()
    })

    it("toggle button respects disabled prop", () => {
      render(<ControlPad onCommand={mockOnCommand} disabled={true} />)

      const toggleButton = screen.getByLabelText("Invert forward/backward controls")
      expect(toggleButton).toBeDisabled()
    })
  })
})
