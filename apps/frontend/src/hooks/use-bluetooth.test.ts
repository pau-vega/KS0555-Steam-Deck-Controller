import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useBluetooth } from "./use-bluetooth"

const capturedBleHandler = vi.hoisted(() => ({ current: null as ((event: { payload: string }) => void) | null }))

const mockUnlisten = vi.hoisted(() => vi.fn())

const mockTauriListen = vi.hoisted(() =>
  vi.fn((_event: string, handler: (event: { payload: string }) => void) => {
    capturedBleHandler.current = handler
    return Promise.resolve(mockUnlisten)
  }),
)

const mockTauriInvoke = vi.hoisted(() => vi.fn())

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockTauriInvoke,
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockTauriListen,
}))

beforeEach(() => {
  vi.clearAllMocks()
  capturedBleHandler.current = null
  ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
  mockTauriInvoke.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  delete (window as unknown as Record<string, unknown>).__TAURI__
})

describe("useBluetooth (Tauri IPC)", () => {
  it("starts disconnected", () => {
    const { result } = renderHook(() => useBluetooth())
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
    expect(result.current.unsupported).toBe(false)
  })

  it("sets up event listener on mount", () => {
    renderHook(() => useBluetooth())
    expect(mockTauriListen).toHaveBeenCalledWith("ble-state-changed", expect.any(Function))
  })

  it("cleans up event listener on unmount", async () => {
    const { unmount } = renderHook(() => useBluetooth())
    await act(async () => {})

    unmount()

    expect(mockUnlisten).toHaveBeenCalled()
  })

  it("connect() calls invoke ble_connect and sets connected", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_connect")
    expect(result.current.connected).toBe(true)
    expect(result.current.connecting).toBe(false)
  })

  it("connect() sets connecting state before invoke resolves", async () => {
    let resolveInvoke: () => void = () => {}
    mockTauriInvoke.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveInvoke = r
        }),
    )
    const { result } = renderHook(() => useBluetooth())

    let promise: Promise<void>
    act(() => {
      promise = result.current.connect()
    })

    expect(result.current.connecting).toBe(true)
    expect(result.current.connected).toBe(false)

    await act(async () => {
      resolveInvoke()
      await promise!
    })

    expect(result.current.connected).toBe(true)
  })

  it("connect() handles error and sets disconnected + error", async () => {
    mockTauriInvoke.mockRejectedValue(new Error("No Bluetooth adapter found"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_connect")
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
    expect(result.current.error).toBe("No Bluetooth adapter found")
  })

  it("connect() handles scan timeout error", async () => {
    mockTauriInvoke.mockRejectedValue(new Error("Scan timeout: BT24 device not found within 5 seconds"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
  })

  it("send() calls invoke ble_send", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })
    mockTauriInvoke.mockClear()

    act(() => {
      result.current.send("F")
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "F150\n" })
  })

  it("send() calls invoke ble_send with B command", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })
    mockTauriInvoke.mockClear()

    act(() => {
      result.current.send("B")
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "B150\n" })
  })

  it("send() surfaces invoke rejection via error state", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    mockTauriInvoke.mockClear()
    mockTauriInvoke.mockRejectedValueOnce(new Error("Invalid BLE payload \"X\": expected '<dir><pwm>\\n' ..."))

    await act(async () => {
      result.current.send("F")
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.error).toContain("Invalid BLE payload")
  })

  it("send() calls invoke ble_send with Stop payload S newline", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })
    mockTauriInvoke.mockClear()

    act(() => {
      result.current.send("S")
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "S\n" })
  })

  it("updates state when ble-state-changed event fires", () => {
    const { result } = renderHook(() => useBluetooth())

    act(() => {
      capturedBleHandler.current?.({ payload: "connecting" })
    })
    expect(result.current.connecting).toBe(true)

    act(() => {
      capturedBleHandler.current?.({ payload: "connected" })
    })
    expect(result.current.connected).toBe(true)

    act(() => {
      capturedBleHandler.current?.({ payload: "disconnected" })
    })
    expect(result.current.connected).toBe(false)
  })

  it("ignores ble-state-changed events after unmount", () => {
    const { result, unmount } = renderHook(() => useBluetooth())
    unmount()

    act(() => {
      capturedBleHandler.current?.({ payload: "connected" })
    })
    expect(result.current.connected).toBe(false)
  })

  it("connect() is a no-op outside Tauri", async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    mockTauriInvoke.mockClear()

    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockTauriInvoke).not.toHaveBeenCalled()
    expect(result.current.connected).toBe(false)
  })

  it("send() is a no-op outside Tauri", () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    mockTauriInvoke.mockClear()

    const { result } = renderHook(() => useBluetooth())

    act(() => {
      result.current.send("F")
    })

    expect(mockTauriInvoke).not.toHaveBeenCalled()
  })
})
