// @ts-nocheck
import { Link, useRouteError } from 'react-router-dom'
import logger from '@/utils/logger'

const NotFound = () => {
  const error = useRouteError?.() || null

  if (error) {
    logger.error('Route error', {
      message: error?.message,
      status: error?.status,
    })
  }

  return (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">🔍</div>
        <h1>{error?.status === 404 ? 'Page Not Found' : 'Oops!'}</h1>
        <p>
          {error?.status === 404
            ? "The page you're looking for doesn't exist or has been moved."
            : error?.message || 'An unexpected error occurred.'}
        </p>
        <div className="error-boundary-actions">
          <Link className="btn primary" to="/">
            Back to Home
          </Link>
          <Link className="btn outline" to="/portal/dashboard">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
