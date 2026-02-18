import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  action?: ReactNode
}

/**
 * Reusable empty-state placeholder.
 */
const EmptyState = ({ icon = '📭', title, message, action }: EmptyStateProps) => (
  <div className="empty-state" role="status">
    <div className="empty-state-icon">{icon}</div>
    <h3 className="empty-state-title">{title}</h3>
    {message && <p className="empty-state-message">{message}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
)

export default EmptyState
