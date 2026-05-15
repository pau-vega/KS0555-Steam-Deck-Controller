import { use } from "react"

import type { InvertControlsContextValue } from "../contexts/invert-controls-context"

import { InvertControlsContext } from "../contexts/invert-controls-context"

export function useInvertControls(): InvertControlsContextValue {
  const ctx = use(InvertControlsContext)
  if (!ctx) throw new Error("useInvertControls must be used within an InvertControlsProvider")
  return ctx
}
