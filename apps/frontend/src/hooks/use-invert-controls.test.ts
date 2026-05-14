import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { useInvertControls } from "./use-invert-controls"

// Stub Tauri internals so the non-Tauri guard path is testable
vi.stubGlobal("__TAURI_INTERNALS__", {})

const { mockInvoke, mockListen, mockUnlisten, listenerCallbacks } = vi.hoisted(() => {
  const callbacks: Record<string, (payload: unknown) => void> = {}
  return {
    mockInvoke: vi.fn(),
    mockListen: vi.fn((_event: string, callback: (event: { payload: unknown }) => void) => {
      callbacks[_event] = (payload: unknown) => callback({ payload })
      return Promise.resolve(mockUnlisten)
    }),
    mockUnlisten: vi.fn(),
    listenerCallbacks: callbacks,
  }
})

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}))

describe("useInvertControls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(listenerCallbacks).forEach((key) => delete listenerCallbacks[key])
    // Default: not inverted
    mockInvoke.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("initial state is false before Tauri async resolves", () => {
    const { result } = renderHook(() => useInvertControls())
    expect(result.current.inverted).toBe(false)
  })

  it("calls invoke('get_invert_state') on mount", async () => {
    mockInvoke.mockResolvedValue(true)
    renderHook(() => useInvertControls())
    await act(async () => {})
    expect(mockInvoke).toHaveBeenCalledWith("get_invert_state")
  })

  it("updates state after get_invert_state resolves", async () => {
    mockInvoke.mockResolvedValue(true)
    const { result } = renderHook(() => useInvertControls())
    await act(async () => {})
    expect(result.current.inverted).toBe(true)
  })

  it("listens for invert-changed events", async () => {
    renderHook(() => useInvertControls())
    await act(async () => {})
    expect(mockListen).toHaveBeenCalledWith("invert-changed", expect.any(Function))
  })

  it("updates state when invert-changed event fires", async () => {
    mockInvoke.mockResolvedValue(false)
    const { result } = renderHook(() => useInvertControls())
    await act(async () => {})

    // Simulate event: inversion toggled on
    act(() => {
      listenerCallbacks["invert-changed"]!(true)
    })
    expect(result.current.inverted).toBe(true)

    // Simulate event: inversion toggled off
    act(() => {
      listenerCallbacks["invert-changed"]!(false)
    })
    expect(result.current.inverted).toBe(false)
  })

  it("toggleInvert calls invoke('toggle_invert')", async () => {
    const { result } = renderHook(() => useInvertControls())
    await act(async () => {})

    await act(async () => {
      await result.current.toggleInvert()
    })

    expect(mockInvoke).toHaveBeenCalledWith("toggle_invert")
  })

  it("cleanup unlistens from invert-changed event", async () => {
    const { unmount } = renderHook(() => useInvertControls())
    await act(async () => {})
    unmount()
    expect(mockUnlisten).toHaveBeenCalled()
  })

  it("returns false and no-op toggle when outside Tauri (no __TAURI_INTERNALS__)", async () => {
    // Remove the global stub for this test
    vi.stubGlobal("__TAURI_INTERNALS__", undefined)
    mockInvoke.mockClear()
    mockListen.mockClear()

    const { result } = renderHook(() => useInvertControls())
    await act(async () => {})

    expect(result.current.inverted).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
    expect(mockListen).not.toHaveBeenCalled()

    // toggleInvert should be callable but not invoke anything
    await act(async () => {
      await result.current.toggleInvert()
    })
    expect(mockInvoke).not.toHaveBeenCalled()

    // Restore stub
    vi.stubGlobal("__TAURI_INTERNALS__", {})
  })
})
