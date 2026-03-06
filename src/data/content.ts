export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Benefits', href: '/#benefits' },
  { label: 'Features', href: '/#features-detail' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Login', href: '/login' },
  { label: 'Contact', href: '/#contact' },
] as const

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
] as const

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
] as const

export const dashboardMetrics = [
  { label: 'Total Students', value: '1,248' },
  { label: 'Total Teachers', value: '86' },
  { label: 'Attendance Today', value: '96%' },
  { label: 'Upcoming Events', value: '4' },
] as const

export const announcements = [
  'Mid-term exams start 25 Feb.',
  'Annual day rehearsal at 3 PM.',
  'Submit project work by 20 Feb.',
] as const

export const quickActions = [
  'Add Student',
  'Upload Marks',
  'Take Attendance',
  'Post Announcement',
] as const

export const heroStats = [
  { label: 'Total Schools', value: '150' },
  { label: 'Total Teachers', value: '1,627' },
  { label: 'Total Students', value: '12,366' },
] as const

export const contactInfo = {
  email: 'support@vidyahub.edu',
  phone: '+91 98765 43210',
  address: '12 Knowledge Street, Hyderabad',
} as const
