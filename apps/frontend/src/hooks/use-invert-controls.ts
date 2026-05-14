import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useState } from "react"

export function useInvertControls() {
  const [inverted, setInverted] = useState(false)

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return

    let unlisten: (() => void) | undefined

    const setup = async () => {
      try {
        const state = await invoke<boolean>("get_invert_state")
        setInverted(state)
      } catch {
        // If Rust commands aren't available, stay with default false
      }

      try {
        const unlistenFn = await listen<boolean>("invert-changed", (event) => {
          setInverted(event.payload)
        })
        unlisten = unlistenFn
      } catch {
        // If event listener fails, just keep default state
      }
    }

    setup()

    return () => {
      unlisten?.()
    }
  }, [])

  const toggleInvert = useCallback(async () => {
    if (!window.__TAURI_INTERNALS__) return
    try {
      await invoke<boolean>("toggle_invert")
    } catch {
      // If toggle fails, state stays unchanged
    }
  }, [])

  return { inverted, toggleInvert }
}
