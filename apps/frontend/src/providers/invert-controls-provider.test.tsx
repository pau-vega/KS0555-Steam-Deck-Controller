import { act, render, renderHook } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useInvertControls } from "../hooks/use-invert-controls"
import { InvertControlsProvider } from "./invert-controls-provider"

const { mockInvoke, mockListen, mockUnlisten, listenerCallbacks } = vi.hoisted(() => {
  const callbacks: Record<string, (payload: unknown) => void> = {}
  return {
    mockInvoke: vi.fn(),
    mockListen: vi.fn((event: string, callback: (event: { payload: unknown }) => void) => {
      callbacks[event] = (payload: unknown) => callback({ payload })
      return Promise.resolve(mockUnlisten)
    }),
    mockUnlisten: vi.fn(),
    listenerCallbacks: callbacks,
  }
})

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }))

const wrapper = ({ children }: { children: ReactNode }) => <InvertControlsProvider>{children}</InvertControlsProvider>

describe("InvertControlsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(listenerCallbacks).forEach((key) => delete listenerCallbacks[key])
    ;(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}
    mockInvoke.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  })

  it("provides default inverted=false before async resolves", () => {
    const { result } = renderHook(() => useInvertControls(), { wrapper })
    expect(result.current.inverted).toBe(false)
  })

  it("calls invoke('get_invert_state') exactly once on mount", async () => {
    renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})
    const getStateCalls = mockInvoke.mock.calls.filter((args) => args[0] === "get_invert_state")
    expect(getStateCalls).toHaveLength(1)
  })

  it("calls listen('invert-changed') exactly once on mount", async () => {
    renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})
    const listenCalls = mockListen.mock.calls.filter((args) => args[0] === "invert-changed")
    expect(listenCalls).toHaveLength(1)
  })

  it("multiple consumers share a single subscription", async () => {
    const Consumer = () => {
      useInvertControls()
      return null
    }
    render(
      <InvertControlsProvider>
        <Consumer />
        <Consumer />
        <Consumer />
      </InvertControlsProvider>,
    )
    await act(async () => {})
    const getStateCalls = mockInvoke.mock.calls.filter((args) => args[0] === "get_invert_state")
    const listenCalls = mockListen.mock.calls.filter((args) => args[0] === "invert-changed")
    expect(getStateCalls).toHaveLength(1)
    expect(listenCalls).toHaveLength(1)
  })

  it("updates state after get_invert_state resolves", async () => {
    mockInvoke.mockResolvedValue(true)
    const { result } = renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})
    expect(result.current.inverted).toBe(true)
  })

  it("updates state when invert-changed event fires", async () => {
    const { result } = renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})

    act(() => {
      listenerCallbacks["invert-changed"]!(true)
    })
    expect(result.current.inverted).toBe(true)

    act(() => {
      listenerCallbacks["invert-changed"]!(false)
    })
    expect(result.current.inverted).toBe(false)
  })

  it("toggleInvert calls invoke('toggle_invert')", async () => {
    const { result } = renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.toggleInvert()
    })
    expect(mockInvoke).toHaveBeenCalledWith("toggle_invert")
  })

  it("cleanup unlistens on unmount", async () => {
    const { unmount } = renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})
    unmount()
    expect(mockUnlisten).toHaveBeenCalled()
  })

  it("does not call invoke/listen outside Tauri", async () => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    mockInvoke.mockClear()
    mockListen.mockClear()

    const { result } = renderHook(() => useInvertControls(), { wrapper })
    await act(async () => {})

    expect(result.current.inverted).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
    expect(mockListen).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.toggleInvert()
    })
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
