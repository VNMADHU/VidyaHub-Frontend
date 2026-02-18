// @ts-nocheck
const ParentDashboard = () => (
  <section className="section">
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Parent Dashboard</h1>
          <p>Monitor your child’s academic progress and attendance.</p>
        </div>
        <button className="btn outline" type="button">
          View Report
        </button>
      </div>
      <div className="page-grid">
        <div className="card">
          <h3>Attendance</h3>
          <p>Review attendance history and percentage.</p>
        </div>
        <div className="card">
          <h3>Marks & Grades</h3>
          <p>Access marks reports and subject performance.</p>
        </div>
        <div className="card">
          <h3>Notifications</h3>
          <p>Receive announcements and event updates.</p>
        </div>
      </div>
    </div>
  </section>
)

export default ParentDashboard
