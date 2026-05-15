import { createContext } from "react"

export interface InvertControlsContextValue {
  inverted: boolean
  toggleInvert: () => Promise<void>
}

export const InvertControlsContext = createContext<InvertControlsContextValue | null>(null)
