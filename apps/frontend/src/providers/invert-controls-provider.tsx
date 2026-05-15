import type { ReactNode } from "react"

import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useMemo, useState } from "react"

import type { InvertControlsContextValue } from "../contexts/invert-controls-context"

import { InvertControlsContext } from "../contexts/invert-controls-context"
import { isTauri } from "../lib/is-tauri"

interface InvertControlsProviderProps {
  children: ReactNode
}

export function InvertControlsProvider({ children }: InvertControlsProviderProps) {
  const [inverted, setInverted] = useState(false)

  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let cancelled = false

    const setup = async () => {
      try {
        const state = await invoke<boolean>("get_invert_state")
        if (!cancelled) setInverted(state)
      } catch {
        // If Rust commands aren't available, stay with default false
      }

      try {
        const fn = await listen<boolean>("invert-changed", (event) => {
          if (cancelled) return
          setInverted(event.payload)
        })
        if (cancelled) fn()
        else unlisten = fn
      } catch {
        // If event listener fails, keep default state
      }
    }

    void setup()

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const toggleInvert = useCallback(async () => {
    if (!isTauri()) return
    try {
      await invoke<boolean>("toggle_invert")
    } catch {
      // If toggle fails, state stays unchanged
    }
  }, [])

  const value = useMemo<InvertControlsContextValue>(() => ({ inverted, toggleInvert }), [inverted, toggleInvert])

  return <InvertControlsContext value={value}>{children}</InvertControlsContext>
}
