import type { ReactNode } from 'react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
}

/**
 * Reusable loading spinner component.
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }: LoadingSpinnerProps) => (
  <div className={`loading-spinner loading-spinner-${size}`} role="status">
    <div className="spinner" />
    <p className="loading-message">{message}</p>
  </div>
)

export default LoadingSpinner
