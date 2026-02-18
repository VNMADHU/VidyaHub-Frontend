/**
 * Reusable empty-state placeholder.
 *
 * Usage:
 *   <EmptyState icon="👥" title="No students found" message="Add your first student to get started." />
 *   <EmptyState icon="📋" title="No exams" action={<button>Create Exam</button>} />
 */
const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div className="empty-state" role="status">
    <div className="empty-state-icon">{icon}</div>
    <h3 className="empty-state-title">{title}</h3>
    {message && <p className="empty-state-message">{message}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
)

export default EmptyState
