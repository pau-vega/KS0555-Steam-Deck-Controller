import { use } from "react"

import { InvertControlsContext, type InvertControlsContextValue } from "../providers/invert-controls-provider"

export function useInvertControls(): InvertControlsContextValue {
  const ctx = use(InvertControlsContext)
  if (!ctx) throw new Error("useInvertControls must be used within an InvertControlsProvider")
  return ctx
}
