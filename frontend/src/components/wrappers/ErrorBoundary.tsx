import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { error: Error | null }

// React only surfaces render-time errors through a class component — there is no hook
// equivalent. Without this, one thrown error in any route blanks the entire app.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-red-500">
          Something broke
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          This page hit an unexpected error
        </h1>
        <p className="max-w-md text-sm text-gray-500">
          The rest of the app is still fine. Reloading usually clears it.
        </p>
        <button
          onClick={() => window.location.assign("/")}
          className="mt-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-400"
        >
          Back to home
        </button>
      </div>
    )
  }
}
