// @ts-nocheck
const SuperAdminDashboard = () => (
  <section className="section">
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p>Approve schools, manage subscriptions, and view analytics.</p>
        </div>
        <button className="btn primary" type="button">
          Review Requests
        </button>
      </div>
      <div className="page-grid">
        <div className="card">
          <h3>School Approvals</h3>
          <p>Review and approve incoming institution requests.</p>
        </div>
        <div className="card">
          <h3>Subscription Plans</h3>
          <p>Manage plans, billing, and access controls.</p>
        </div>
        <div className="card">
          <h3>Platform Analytics</h3>
          <p>Track institution usage and engagement metrics.</p>
        </div>
      </div>
    </div>
  </section>
)

export default SuperAdminDashboard
