const TeacherDashboard = () => (
  <section className="section">
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p>Take attendance, upload marks, and manage homework.</p>
        </div>
        <button className="btn primary" type="button">
          Take Attendance
        </button>
      </div>
      <div className="page-grid">
        <div className="card">
          <h3>Assigned Classes</h3>
          <p>View classes and sections assigned to you.</p>
        </div>
        <div className="card">
          <h3>Marks Upload</h3>
          <p>Record scores by subject and exam type.</p>
        </div>
        <div className="card">
          <h3>Homework</h3>
          <p>Publish homework and notify students instantly.</p>
        </div>
      </div>
    </div>
  </section>
)

export default TeacherDashboard
