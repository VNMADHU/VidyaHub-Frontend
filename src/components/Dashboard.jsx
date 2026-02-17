import { announcements, dashboardMetrics, quickActions } from '../data/content'

const Dashboard = () => (
  <section id="dashboard" className="section">
    <div className="container">
      <h2>Sample Dashboard</h2>
      <div className="dashboard">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="card metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid two">
        <div className="card">
          <h3>Recent Announcements</h3>
          <ul>
            {announcements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            {quickActions.map((action) => (
              <button key={action} className="btn small" type="button">
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Dashboard
