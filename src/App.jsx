import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ConfirmDialogProvider } from './components/ConfirmDialog'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/ToastContainer'
import RootLayout from './layouts/RootLayout'
import SchoolPortalLayout from './layouts/SchoolPortalLayout'
import AdminDashboard from './pages/AdminDashboard'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ParentDashboard from './pages/ParentDashboard'
import StudentDashboard from './pages/StudentDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import PortalDashboard from './pages/PortalDashboard'
import StudentsPage from './pages/StudentsPage'
import TeachersPage from './pages/TeachersPage'
import ExamsPage from './pages/ExamsPage'
import AttendancePage from './pages/AttendancePage'
import EventsPage from './pages/EventsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import AchievementsPage from './pages/AchievementsPage'
import SportsPage from './pages/SportsPage'
import ClassesPage from './pages/ClassesPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import ExamManagementPage from './pages/ExamManagementPage'
import StudentDetailPage from './pages/StudentDetailPage'
import TeacherDetailPage from './pages/TeacherDetailPage'
import FeesPage from './pages/FeesPage'
import IncomePage from './pages/IncomePage'
import TimetablePage from './pages/TimetablePage'
import ReportCardPage from './pages/ReportCardPage'
import AttendanceReportPage from './pages/AttendanceReportPage'
import TransferCertificatePage from './pages/TransferCertificatePage'
import HomeworkPage from './pages/HomeworkPage'
import NotificationsPage from './pages/NotificationsPage'
import ProtectedRoute from './components/ProtectedRoute'
import StudentLoginPage from './pages/StudentLoginPage'
import TeacherLoginPage from './pages/TeacherLoginPage'
import MyStudentProfile from './pages/MyStudentProfile'
import MyTeacherProfile from './pages/MyTeacherProfile'
import LibraryPage from './pages/LibraryPage'
import TransportPage from './pages/TransportPage'
import DriverDetailPage from './pages/DriverDetailPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import StaffDetailPage from './pages/StaffDetailPage'
import ExpensesPage from './pages/ExpensesPage'
import SupportPage from './pages/SupportPage'
import HolidaysPage from './pages/HolidaysPage'
import LeavesPage from './pages/LeavesPage'
import StaffPage from './pages/StaffPage'
import HostelPage from './pages/HostelPage'
import AdmissionsPage from './pages/AdmissionsPage'
import AdminProfilesPage from './pages/AdminProfilesPage'
import LoginPage from './pages/LoginPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole="school-admin">
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher',
        element: (
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'student',
        element: (
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'parent',
        element: (
          <ProtectedRoute requiredRole="parent">
            <ParentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'super-admin',
        element: (
          <ProtectedRoute requiredRole="super-admin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Student & Teacher self-service portal (login pages — public)
  { path: '/login', element: <LoginPage /> },
  { path: '/student-login', element: <StudentLoginPage /> },
  { path: '/teacher-login', element: <TeacherLoginPage /> },
  // Student & Teacher profile pages — protected by JWT
  {
    path: '/my/student/:studentId',
    element: (
      <ProtectedRoute requiredRole="portal-student">
        <MyStudentProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my/teacher/:teacherId',
    element: (
      <ProtectedRoute requiredRole="portal-teacher">
        <MyTeacherProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/portal',
    element: (
      <ProtectedRoute>
        <SchoolPortalLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/:studentId', element: <StudentDetailPage /> },
      { path: 'teachers', element: <TeachersPage /> },
      { path: 'teachers/:teacherId', element: <TeacherDetailPage /> },
      { path: 'classes', element: <ClassesPage /> },
      { path: 'exams', element: <ExamsPage /> },
      { path: 'exam-management', element: <ExamManagementPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'fees', element: <FeesPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'timetable', element: <TimetablePage /> },
      { path: 'report-card', element: <ReportCardPage /> },
      { path: 'attendance-report', element: <AttendanceReportPage /> },
      { path: 'transfer-certificate', element: <TransferCertificatePage /> },
      { path: 'homework', element: <HomeworkPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'sports', element: <SportsPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'transport', element: <TransportPage /> },
      { path: 'transport/drivers/:driverId', element: <DriverDetailPage /> },
      { path: 'transport/vehicles/:vehicleId', element: <VehicleDetailPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'holidays', element: <HolidaysPage /> },
      { path: 'leaves', element: <LeavesPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'staff/:staffId', element: <StaffDetailPage /> },
      { path: 'hostel', element: <HostelPage /> },
      { path: 'admissions', element: <AdmissionsPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin-profiles', element: <AdminProfilesPage /> },
    ],
  },
])

const App = () => {
  return (
    <ErrorBoundary>
      <ConfirmDialogProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </ConfirmDialogProvider>
    </ErrorBoundary>
  )
}

export default App
