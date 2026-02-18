import { Component } from 'react'
import { APP_NAME } from '../utils/constants'
import logger from '../utils/logger'

/**
 * React Error Boundary — catches unhandled errors in the component tree
 * and displays a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React ErrorBoundary caught an error', {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    })
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h1>Something went wrong</h1>
            <p>
              {APP_NAME} encountered an unexpected error. Please try reloading
              the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details (dev only)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo?.componentStack && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                className="btn primary"
                onClick={this.handleReload}
                type="button"
              >
                Reload Page
              </button>
              <button
                className="btn outline"
                onClick={this.handleGoHome}
                type="button"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
