import { useEffect, useState } from 'react'
import useDataStore from '../store/useDataStore'
import apiClient from '../services/apiClient'

const AdminDashboard = () => {
  const students = useDataStore((state) => state.students)
  const setStudents = useDataStore((state) => state.setStudents)
  const [loading, setLoading] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNumber: '',
    className: '',
    section: '',
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const data = await apiClient.listStudents()
      setStudents(data.data || [])
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (event) => {
    event.preventDefault()
    try {
      const response = await apiClient.createStudent({
        ...newStudent,
        schoolId: '1',
      })
      setNewStudent({ name: '', rollNumber: '', className: '', section: '' })
      fetchStudents()
    } catch (error) {
      console.error('Failed to add student:', error)
    }
  }

  return (
    <section className="section">
      <div className="container page">
        <div className="page-header">
          <div>
            <h1>School Admin Dashboard</h1>
            <p>Manage students, teachers, attendance, and marks.</p>
          </div>
          <button className="btn primary" type="button">
            Add Student
          </button>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Add New Student</h3>
            <form onSubmit={handleAddStudent}>
              <label>
                Name
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Roll Number
                <input
                  type="text"
                  value={newStudent.rollNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  required
                />
              </label>
              <label>
                Class
                <input
                  type="text"
                  value={newStudent.className}
                  onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                  required
                />
              </label>
              <label>
                Section
                <input
                  type="text"
                  value={newStudent.section}
                  onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                  required
                />
              </label>
              <button className="btn small" type="submit">
                Add Student
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Total Students ({loading ? '...' : students.length})</h3>
            <p>
              {loading ? 'Loading students...' : `${students.length} students registered`}
            </p>
          </div>

          <div className="card">
            <h3>Teacher Management</h3>
            <p>Onboard teachers, assign subjects, and manage workloads.</p>
          </div>

          <div className="card">
            <h3>Attendance</h3>
            <p>Track daily attendance and export monthly summaries.</p>
          </div>

          <div className="card">
            <h3>Marks & Reports</h3>
            <p>Upload exam marks and generate report cards.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminDashboard
