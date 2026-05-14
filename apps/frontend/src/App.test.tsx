import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { App } from "./app"

const mockUseGamepad = vi.fn()

// Stable send mock reference so it persists across re-renders within the same test
const mockSend = vi.fn()
const mockConnect = vi.fn()

vi.mock("./hooks/use-bluetooth", () => ({
  useBluetooth: () => ({
    connected: true,
    connecting: false,
    unsupported: false,
    connect: mockConnect,
    send: mockSend,
  }),
}))

vi.mock("./hooks/use-gamepad", () => ({
  useGamepad: () => mockUseGamepad(),
}))

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGamepad.mockReturnValue({
      direction: "S" as const,
      gamepadConnected: true,
    })
  })

  // FRONT-07 gap test — commands only sent on direction change, not continuously

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders robot controller heading", () => {
    render(<App />)
    expect(screen.getByText(/Robot Controller/)).toBeInTheDocument()
  })

  it("displays StatusBar component", () => {
    render(<App />)
    const statusPills = document.querySelectorAll(".px-3.py-1")
    expect(statusPills.length).toBeGreaterThanOrEqual(2)
  })

  it("displays ControlPad component", () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll("button")
    expect(buttons.length).toBe(6)
  })

  it("displays last command section", () => {
    render(<App />)
    const elements = screen.getAllByText(/Last command:/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it("displays current direction section", () => {
    render(<App />)
    const elements = screen.getAllByText(/Current direction:/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it("shows initial direction S", () => {
    render(<App />)
    const strongElements = document.querySelectorAll("strong")
    const hasS = Array.from(strongElements).some((el) => el.textContent === "S")
    expect(hasS).toBe(true)
  })

  it("updates display when direction changes to F", () => {
    mockUseGamepad.mockReturnValue({
      direction: "F" as const,
      gamepadConnected: true,
    })
    render(<App />)
    const strongElements = document.querySelectorAll("strong")
    const hasF = Array.from(strongElements).some((el) => el.textContent === "F")
    expect(hasF).toBe(true)
  })

  it("FRONT-07: send() called once when direction changes and not called again on re-render with same direction", async () => {
    // Start with direction 'S' (matches prevDirection.current initial value)
    mockUseGamepad.mockReturnValue({
      direction: "S" as const,
      gamepadConnected: true,
    })
    const { rerender } = render(<App />)

    // send() must NOT have been called — 'S' equals prevDirection.current initial value
    expect(mockSend).not.toHaveBeenCalled()

    // Change direction to 'F' — this is a real direction change, send() should fire once
    act(() => {
      mockUseGamepad.mockReturnValue({
        direction: "F" as const,
        gamepadConnected: true,
      })
    })
    rerender(<App />)

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith("F")

    // Re-render with the SAME direction 'F' — no change, send() must NOT be called again
    act(() => {
      mockUseGamepad.mockReturnValue({
        direction: "F" as const,
        gamepadConnected: true,
      })
    })
    rerender(<App />)

    // Still exactly 1 call total — the second render with same direction must not trigger send()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
