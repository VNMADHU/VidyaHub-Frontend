import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '../services/apiClient'
import { useConfirm } from '../components/ConfirmDialog'
import BulkImportModal from '../components/BulkImportModal'

const ExamsPage = () => {
  const { confirm } = useConfirm()
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [examsList, setExamsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [formData, setFormData] = useState({
    studentId: '',
    examId: '',
    marks: '',
    subject: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadSections(selectedClass)
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  const loadData = async () => {
    try {
      const [marksResponse, studentsResponse, examsResponse, classesResponse] = await Promise.all([
        apiClient.listMarks(),
        apiClient.listStudents(),
        apiClient.listExams(),
        apiClient.listClasses(),
      ])
      setExams(marksResponse?.data || [])
      setStudents(studentsResponse?.data || [])
      setExamsList(examsResponse?.data || [])
      setClasses(classesResponse?.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSections = async (classId) => {
    try {
      const response = await apiClient.listSections(classId)
      setSections(response?.data || [])
    } catch (error) {
      console.error('Failed to load sections:', error)
    }
  }

  const loadExams = async () => {
    try {
      const response = await apiClient.listMarks()
      setExams(response?.data || [])
    } catch (error) {
      console.error('Failed to load exams:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        studentId: Number(formData.studentId),
        examId: Number(formData.examId),
        marks: Number(formData.marks),
        subject: formData.subject,
      }
      if (editingId) {
        await apiClient.updateMarks(editingId, payload)
      } else {
        await apiClient.createMarks(payload)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        studentId: '',
        examId: '',
        marks: '',
        subject: '',
      })
      loadExams()
    } catch (error) {
      console.error('Failed to create exam:', error)
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      studentId: '',
      examId: '',
      marks: '',
      subject: '',
    })
    setShowForm(true)
  }

  const handleEdit = (mark) => {
    setEditingId(mark.id)
    setFormData({
      studentId: String(mark.studentId || ''),
      examId: String(mark.examId || ''),
      marks: String(mark.score ?? mark.marks ?? ''),
      subject: mark.subject || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (markId) => {
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this mark entry?',
    })
    if (!confirmed) return
    try {
      await apiClient.deleteMarks(markId)
      loadExams()
    } catch (error) {
      console.error('Failed to delete marks:', error)
    }
  }

  const handleBulkImportDone = async () => {
    await loadExams()
  }

  const marksTemplateHeaders = ['studentId', 'examId', 'marks', 'subject']

  const mapMarksRow = (row) => {
    if (!row.studentId || !row.examId) {
      return null
    }

    return {
      studentId: Number(row.studentId),
      examId: Number(row.examId),
      marks: row.marks !== '' && row.marks !== undefined ? Number(row.marks) : 0,
      subject: row.subject ? String(row.subject).trim() : '',
    }
  }

  const filteredStudents = students.filter(student => {
    if (selectedClass && student.classId !== Number(selectedClass)) return false
    if (selectedSection && student.sectionId !== Number(selectedSection)) return false
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exams & Marks</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={() => showForm ? setShowForm(false) : handleAddNew()}>
            {showForm ? 'Cancel' : '+ Add Marks'}
          </button>
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-mini">
          <span className="stat-label">Class</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        <div className="stat-mini">
          <span className="stat-label">Section</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>{editingId ? 'Edit Marks' : 'Add Marks'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
            >
              <option value="">Select Student</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} ({student.admissionNumber})
                </option>
              ))}
            </select>
            <select
              value={formData.examId}
              onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
              required
            >
              <option value="">Select Exam</option>
              {examsList.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Marks"
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
            <button type="submit" className="btn primary">
              {editingId ? 'Update Marks' : 'Add Marks'}
            </button>
          </form>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          title="Marks"
          templateHeaders={marksTemplateHeaders}
          mapRowToPayload={mapMarksRow}
          createItem={(payload) => apiClient.createMarks(payload)}
          onClose={() => setShowBulkImport(false)}
          onDone={handleBulkImportDone}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading exams...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.filter(exam => {
                const student = students.find(s => s.id === exam.studentId)
                if (!student) return false
                if (selectedClass && student.classId !== Number(selectedClass)) return false
                if (selectedSection && student.sectionId !== Number(selectedSection)) return false
                return true
              }).length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-row">
                    No marks recorded. Add your first marks!
                  </td>
                </tr>
              ) : (
                exams.filter(exam => {
                  const student = students.find(s => s.id === exam.studentId)
                  if (!student) return false
                  if (selectedClass && student.classId !== Number(selectedClass)) return false
                  if (selectedSection && student.sectionId !== Number(selectedSection)) return false
                  return true
                }).map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.student ? `${exam.student.firstName} ${exam.student.lastName}` : exam.studentId}</td>
                    <td>{exam.exam?.name || exam.examId}</td>
                    <td>{exam.subject || '-'}</td>
                    <td>{exam.score ?? exam.marks ?? '-'}</td>
                    <td>
                      <button className="btn-icon edit" onClick={() => handleEdit(exam)} aria-label="Edit marks">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(exam.id)} aria-label="Delete marks">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ExamsPage
