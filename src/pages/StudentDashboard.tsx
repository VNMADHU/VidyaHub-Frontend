// @ts-nocheck
const StudentDashboard = () => (
  <section className="section">
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Check marks, attendance, and timetable updates.</p>
        </div>
        <button className="btn outline" type="button">
          View Timetable
        </button>
      </div>
      <div className="page-grid">
        <div className="card">
          <h3>Marks</h3>
          <p>Track subject-wise marks and grade summaries.</p>
        </div>
        <div className="card">
          <h3>Attendance</h3>
          <p>View daily and monthly attendance trends.</p>
        </div>
        <div className="card">
          <h3>Announcements</h3>
          <p>Stay updated with school announcements.</p>
        </div>
      </div>
    </div>
  </section>
)

export default StudentDashboard
