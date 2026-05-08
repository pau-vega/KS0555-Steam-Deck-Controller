import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { useBluetooth } from "./use-bluetooth"

vi.stubGlobal("__TAURI_INTERNALS__", {})

const { mockInvoke, mockUnlisten, getBleStateCallback, setBleStateCallback } = vi.hoisted(() => {
  let bleStateCallback: ((payload: string) => void) | null = null
  return {
    mockInvoke: vi.fn(),
    mockUnlisten: vi.fn(),
    getBleStateCallback: () => bleStateCallback,
    setBleStateCallback: (cb: ((payload: string) => void) | null) => {
      bleStateCallback = cb
    },
  }
})

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((_event: string, callback: (event: { payload: string }) => void) => {
    setBleStateCallback((payload: string) => callback({ payload }))
    return Promise.resolve(mockUnlisten)
  }),
}))

describe("useBluetooth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    setBleStateCallback(null)
  })

  it("starts disconnected", () => {
    const { result } = renderHook(() => useBluetooth())
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
    expect(result.current.unsupported).toBe(false)
  })

  it("connect() sets connecting state then invokes ble_connect", async () => {
    mockInvoke.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useBluetooth())

    let promise: Promise<void>
    act(() => {
      promise = result.current.connect()
    })

    // Should set connecting immediately
    expect(result.current.connecting).toBe(true)

    await act(async () => {
      await promise!
    })
    expect(mockInvoke).toHaveBeenCalledWith("ble_connect")
  })

  it("send() calls invoke('ble_send')", () => {
    const { result } = renderHook(() => useBluetooth())
    result.current.send("F")
    expect(mockInvoke).toHaveBeenCalledWith("ble_send", { command: "F" })
  })

  it("listener updates state from ble-state-changed payload", async () => {
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {})

    act(() => {
      getBleStateCallback()!("connected")
    })
    expect(result.current.connected).toBe(true)
    expect(result.current.connecting).toBe(false)

    act(() => {
      getBleStateCallback()!("disconnected")
    })
    expect(result.current.connected).toBe(false)
  })

  it("connect() sets disconnected on invoke rejection and re-throws", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Connection failed"))
    const { result } = renderHook(() => useBluetooth())

    await act(async () => {
      await expect(result.current.connect()).rejects.toThrow("Connection failed")
    })

    expect(result.current.connecting).toBe(false)
    expect(result.current.connected).toBe(false)
  })

  it("cleanup calls unlisteners", async () => {
    const { unmount } = renderHook(() => useBluetooth())
    // Flush microtasks so the async effect setup completes
    await act(async () => {})
    unmount()
    expect(mockUnlisten).toHaveBeenCalled()
  })
})
