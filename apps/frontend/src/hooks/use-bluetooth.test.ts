import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { useBluetooth } from "./use-bluetooth"

// --- Web Bluetooth mocks ---
const mockWriteValue = vi.fn()
const mockGetCharacteristic = vi.fn()
const mockGetPrimaryService = vi.fn()
const mockGattConnect = vi.fn()
const mockRequestDevice = vi.fn()
const mockAddEventListener = vi.fn()

// --- Tauri IPC mocks (must use vi.hoisted — vi.mock factory is hoisted above all const/let) ---
const capturedBleHandler = vi.hoisted(
  () => ({ current: null as ((event: { payload: string }) => void) | null }),
)

const mockUnlisten = vi.hoisted(() => vi.fn())

const mockTauriListen = vi.hoisted(
  () =>
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
  delete (window as unknown as Record<string, unknown>).__TAURI__
  capturedBleHandler.current = null
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useBluetooth (Web Bluetooth)", () => {
  beforeEach(() => {
    mockWriteValue.mockResolvedValue(undefined)
    mockGetCharacteristic.mockResolvedValue({ writeValue: mockWriteValue })
    mockGetPrimaryService.mockResolvedValue({ getCharacteristic: mockGetCharacteristic })
    mockGattConnect.mockResolvedValue({ getPrimaryService: mockGetPrimaryService })
    mockRequestDevice.mockResolvedValue({
      gatt: { connect: mockGattConnect },
      addEventListener: mockAddEventListener,
    })

    Object.defineProperty(navigator, "bluetooth", {
      value: { requestDevice: mockRequestDevice },
      configurable: true,
      writable: true,
    })
  })

  it("starts disconnected when bluetooth available", () => {
    const { result } = renderHook(() => useBluetooth())
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
    expect(result.current.unsupported).toBe(false)
  })

  it("connect() sets connected after GATT chain resolves", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.connecting).toBe(false)
  })

  it("connect() requests device with BT24 name filter", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockRequestDevice).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ name: "BT24" }] }))
  })

  it("send() writes encoded data when connected", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    act(() => {
      result.current.send("F")
    })

    expect(mockWriteValue).toHaveBeenCalledTimes(1)
    const [arg] = mockWriteValue.mock.calls[0] ?? []
    expect(arg?.[0]).toBe(70)
  })

  it("send() does nothing when disconnected", () => {
    const { result } = renderHook(() => useBluetooth())

    act(() => {
      result.current.send("F")
    })

    expect(mockWriteValue).not.toHaveBeenCalled()
  })

  it("connect() sets disconnected on requestDevice rejection", async () => {
    mockRequestDevice.mockRejectedValue(new Error("User cancelled"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
  })

  it("connect() sets disconnected when device has no gatt", async () => {
    mockRequestDevice.mockResolvedValue({
      gatt: null,
      addEventListener: mockAddEventListener,
    })
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
  })
})

describe("useBluetooth (Tauri IPC)", () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).__TAURI__ = true
    delete (navigator as unknown as Record<string, unknown>).bluetooth
    mockTauriInvoke.mockResolvedValue(undefined)
  })

  it("starts disconnected in Tauri mode", () => {
    const { result } = renderHook(() => useBluetooth())
    expect(result.current.connected).toBe(false)
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
    mockTauriInvoke.mockImplementation(() => new Promise<void>((r) => { resolveInvoke = r }))
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

  it("connect() handles error and sets disconnected", async () => {
    mockTauriInvoke.mockRejectedValue(new Error("No Bluetooth adapter found"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_connect")
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
  })

  it("connect() handles scan timeout error", async () => {
    mockTauriInvoke.mockRejectedValue(new Error("Scan timeout: BT24 device not found within 5 seconds"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.connected).toBe(false)
  })

  it("send() calls invoke ble_send in Tauri mode", async () => {
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await result.current.connect()
    })
    mockTauriInvoke.mockClear()

    act(() => {
      result.current.send("F")
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "F" })
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

    expect(mockTauriInvoke).toHaveBeenCalledWith("ble_send", { command: "B" })
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
})
