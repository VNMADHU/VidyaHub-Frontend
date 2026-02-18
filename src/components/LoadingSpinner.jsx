/**
 * Reusable loading spinner component.
 *
 * Usage:
 *   <LoadingSpinner />
 *   <LoadingSpinner message="Loading students..." />
 *   <LoadingSpinner size="small" />
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => (
  <div className={`loading-spinner loading-spinner-${size}`} role="status">
    <div className="spinner" />
    <p className="loading-message">{message}</p>
  </div>
)

export default LoadingSpinner
