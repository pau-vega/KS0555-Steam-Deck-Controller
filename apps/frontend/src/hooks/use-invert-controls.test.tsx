import type { ReactNode } from "react"

import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { InvertControlsContextValue } from "../contexts/invert-controls-context"

import { InvertControlsContext } from "../contexts/invert-controls-context"
import { useInvertControls } from "./use-invert-controls"

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }))

describe("useInvertControls", () => {
  it("returns the context value when wrapped in a provider", () => {
    const value: InvertControlsContextValue = { inverted: true, toggleInvert: vi.fn() }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <InvertControlsContext value={value}>{children}</InvertControlsContext>
    )

    const { result } = renderHook(() => useInvertControls(), { wrapper })

    expect(result.current.inverted).toBe(true)
    expect(result.current.toggleInvert).toBe(value.toggleInvert)
  })

  it("throws when used outside an InvertControlsProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useInvertControls())).toThrow(/InvertControlsProvider/)
    consoleSpy.mockRestore()
  })
})
