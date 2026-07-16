import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

// Contains map/render failures so they surface as a message instead of
// blanking the app. Class component: React error boundaries have no hook
// equivalent.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary" role="alert">
          <div className="err-box">
            <h2>RENDER FAULT</h2>
            <p className="err-msg">{this.state.error.message}</p>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                // Strip the hash before reloading: a poisoned deep link would
                // otherwise crash again on every reload, forever.
                window.location.replace(
                  window.location.pathname + window.location.search,
                )
              }}
            >
              RELOAD
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
