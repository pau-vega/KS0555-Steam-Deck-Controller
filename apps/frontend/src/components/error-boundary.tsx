import { Component, type ReactNode } from "react"

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-4 p-8">
          <h2 className="text-xl font-bold text-error-text">App error</h2>
          <p className="text-sm text-muted">{this.state.error.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
