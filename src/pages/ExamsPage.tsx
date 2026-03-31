// @ts-nocheck
import { useEffect, useState } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import BulkImportModal from '@/components/BulkImportModal'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import Modal from '../components/Modal'

// CBSE-style grade calculation
const getGrade = (score, maxScore = 100) => {
  const pct = (score / maxScore) * 100
  if (pct >= 91) return { grade: 'A1', color: '#059669' }
  if (pct >= 81) return { grade: 'A2', color: '#10b981' }
  if (pct >= 71) return { grade: 'B1', color: '#3b82f6' }
  if (pct >= 61) return { grade: 'B2', color: '#6366f1' }
  if (pct >= 51) return { grade: 'C1', color: '#f59e0b' }
  if (pct >= 41) return { grade: 'C2', color: '#f97316' }
  if (pct >= 33) return { grade: 'D', color: '#ef4444' }
  return { grade: 'Fail', color: '#dc2626' }
}

const ExamsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [examsList, setExamsList] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    studentId: '',
    examId: '',
    marks: '',
    maxScore: '100',
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
      const [marksResponse, studentsResponse, examsResponse, classesResponse, subjectsResponse] = await Promise.all([
        apiClient.listMarks(),
        apiClient.listStudents(),
        apiClient.listExams(),
        apiClient.listClasses(),
        apiClient.listSubjects(),
      ])
      setExams(marksResponse?.data || [])
      setStudents(studentsResponse?.data || [])
      setExamsList(examsResponse?.data || [])
      setClasses(classesResponse?.data || [])
      setSubjects(subjectsResponse?.data || [])
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

  const filteredStudents = students.filter(student => {
    if (selectedClass && student.classId !== Number(selectedClass)) return false
    if (selectedSection && student.sectionId !== Number(selectedSection)) return false
    return true
  })

  const filteredExamsList = examsList.filter(exam => {
    if (selectedClass && exam.classId && exam.classId !== Number(selectedClass)) return false
    if (selectedSection && exam.sectionId && exam.sectionId !== Number(selectedSection)) return false
    return true
  })

  const filteredExams = exams.filter(exam => {
    const student = students.find(s => s.id === exam.studentId)
    if (!student) return false
    if (selectedClass && student.classId !== Number(selectedClass)) return false
    if (selectedSection && student.sectionId !== Number(selectedSection)) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const studentName = `${student.firstName} ${student.lastName}`.toLowerCase()
      const examName = exam.exam?.name?.toLowerCase() || ''
      const subject = exam.subject?.toLowerCase() || ''
      return (
        studentName.includes(query) ||
        examName.includes(query) ||
        subject.includes(query)
      )
    }
    return true
  })

  const { paginatedItems: paginatedExams, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredExams)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        studentId: Number(formData.studentId),
        examId: Number(formData.examId),
        marks: Number(formData.marks),
        maxScore: Number(formData.maxScore) || 100,
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
        maxScore: '100',
        subject: '',
      })
      loadExams()
    } catch (error) {
      console.error('Failed to create exam:', error)
      toast.error(error?.message || 'Failed to save marks.')
    }
  }

  const handleAddNew = () => {
    setEditingId(null)
    setFormData({
      studentId: '',
      examId: '',
      marks: '',
      maxScore: '100',
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
      maxScore: String(mark.maxScore || 100),
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
      toast.error(error?.message || 'Failed to delete marks.')
    }
  }

  const handleBulkImportDone = async () => {
    await loadExams()
  }

  const marksTemplateHeaders = ['studentId', 'examId', 'subject', 'marks', 'maxScore']

  const mapMarksRow = (row) => {
    if (!row.studentId || !row.examId) {
      return null
    }

    return {
      studentId: Number(row.studentId),
      examId: Number(row.examId),
      subject: row.subject ? String(row.subject).trim() : '',
      marks: row.marks !== '' && row.marks !== undefined ? Number(row.marks) : 0,
      maxScore: row.maxScore ? Number(row.maxScore) : 100,
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exams & Marks</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn outline" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </button>
          <button className="btn primary" onClick={handleAddNew}>
            + Add Marks
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

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by student name, exam, or subject..."
      />

      <div className="page-content-scrollable">
      {showForm && (
        <Modal title={editingId ? 'Edit Marks' : 'Add Marks'} onClose={() => setShowForm(false)} footer={<button type="submit" form="exam-form" className="btn primary">{editingId ? 'Update Marks' : 'Add Marks'}</button>}>
          <form id="exam-form" onSubmit={handleSubmit} className="form-grid">
            <label>
              <span className="field-label">Student *</span>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                required
              >
                <option value="">Select Student *</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} ({student.admissionNumber})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Exam *</span>
              <select
                value={formData.examId}
                onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                required
              >
                <option value="">Select Exam *</option>
                {filteredExamsList.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}{exam.class ? ` (${exam.class.name}${exam.section ? ` - ${exam.section.name}` : ''})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Marks *</span>
              <input
                type="number"
                placeholder="Marks *"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Max Score</span>
              <input
                type="number"
                placeholder="Max Score (default 100)"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Subject *</span>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              >
                <option value="">-- Select Subject * --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
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
        <>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Section</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Marks</th>
                <th>%</th>
                <th>Grade</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-row">
                    {searchQuery || selectedClass || selectedSection ? 'No marks match your filters.' : 'No marks recorded. Add your first marks!'}
                  </td>
                </tr>
              ) : (
                paginatedExams.map((exam) => {
                  const student = students.find(s => s.id === exam.studentId)
                  const cls = student ? classes.find(c => c.id === student.classId) : null
                  const sec = sections.length > 0 && student
                    ? sections.find(s => s.id === student.sectionId)
                    : null
                  const score = exam.score ?? exam.marks ?? 0
                  const maxScore = exam.maxScore || 100
                  const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0
                  const { grade, color } = getGrade(score, maxScore)
                  return (
                  <tr key={exam.id}>
                    <td>{exam.student ? `${exam.student.firstName} ${exam.student.lastName}` : exam.studentId}</td>
                    <td>{cls?.name || '-'}</td>
                    <td>{sec?.name || '-'}</td>
                    <td>{exam.exam?.name || exam.examId}</td>
                    <td>{exam.subject || '-'}</td>
                    <td>{score}/{maxScore}</td>
                    <td>{pct}%</td>
                    <td><span style={{ color, fontWeight: 600 }}>{grade}</span></td>
                    <td>
                      <button className="btn-icon edit" onClick={() => handleEdit(exam)} aria-label="Edit marks">
                        <SquarePen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(exam.id)} aria-label="Delete marks">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={goToPage} />
        </>
      )}
      </div>
    </div>
  )
}

export default ExamsPage
