import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import { ErrorBoundary } from "./components/error-boundary"
import { InvertControlsProvider } from "./providers/invert-controls-provider"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <InvertControlsProvider>
        <App />
      </InvertControlsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
