export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'Roles', href: '/#roles' },
  { label: 'Dashboard', href: '/#dashboard' },
  { label: 'Login', href: '/#auth' },
  { label: 'Contact', href: '/#contact' },
]

export const features = [
  {
    title: 'Authentication',
    description:
      'Secure, role-based access with OTP-ready flows and JWT integration.',
  },
  {
    title: 'Student Management',
    description:
      'Add, edit, and assign students to classes with rich profile data.',
  },
  {
    title: 'Teacher Management',
    description:
      'Manage staff, subjects, and class assignments from a single hub.',
  },
  {
    title: 'Attendance',
    description:
      'Track daily attendance with monthly summaries and exports.',
  },
  {
    title: 'Marks & Reports',
    description:
      'Capture exam scores, calculate grades, and generate report cards.',
  },
  {
    title: 'Events & Announcements',
    description:
      'Publish updates with images and notifications for the campus.',
  },
]

export const roles = [
  {
    title: 'Super Admin',
    items: ['Approve institutions', 'Manage subscriptions', 'Platform analytics'],
  },
  {
    title: 'School Admin',
    items: ['Manage school profile', 'Add teachers and students', 'Manage marks'],
  },
  {
    title: 'Teacher',
    items: ['Take attendance', 'Upload marks', 'Assign homework'],
  },
  {
    title: 'Student',
    items: ['View marks and attendance', 'Check timetable', 'See announcements'],
  },
  {
    title: 'Parent',
    items: ['Monitor child progress', 'Receive notifications', 'View reports'],
  },
]

export const dashboardMetrics = [
  { label: 'Total Students', value: '1,248' },
  { label: 'Total Teachers', value: '86' },
  { label: 'Attendance Today', value: '96%' },
  { label: 'Upcoming Events', value: '4' },
]

export const announcements = [
  'Mid-term exams start 25 Feb.',
  'Annual day rehearsal at 3 PM.',
  'Submit project work by 20 Feb.',
]

export const quickActions = [
  'Add Student',
  'Upload Marks',
  'Take Attendance',
  'Post Announcement',
]

export const heroStats = [
  { label: 'Total Students', value: '1,248' },
  { label: 'Attendance', value: '96%' },
  { label: 'Announcements', value: '12' },
]

export const contactInfo = {
  email: 'support@vidyahub.edu',
  phone: '+91 98765 43210',
  address: '12 Knowledge Street, Hyderabad',
}
