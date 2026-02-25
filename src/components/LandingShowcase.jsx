import Image1 from '../assets/Image1.jpg'
import Image2 from '../assets/Image2.jpg'
import Image3 from '../assets/Image3.jpg'
import Image4 from '../assets/Image4.jpg'
import Image5 from '../assets/Image5.jpg'
import Image6 from '../assets/Image6.jpg'
import Image7 from '../assets/Imaage7.jpg'
import Image8 from '../assets/Image8.jpg'
import Image9 from '../assets/Image9.jpg'
import Image10 from '../assets/Image10.jpg'
import Image11 from '../assets/Image11.jpg'
import Image12 from '../assets/Image12.jpg'

const featureSections = [
  {
    image: Image1,
    title: 'Student Management',
    subtitle: 'Complete student profiles at your fingertips',
    badge: 'For Schools',
    description:
      'Maintain comprehensive student records including personal details, class assignments, roll numbers, and profile photos. Easily add, edit, search, and organize students across classes and sections — all from a single, intuitive interface.',
    highlights: ['Bulk import via CSV', 'Class & section assignment', 'Rich profile cards', 'Instant search & filters'],
  },
  {
    image: Image2,
    title: 'Attendance Tracking',
    subtitle: 'Daily attendance made effortless',
    badge: 'For Teachers',
    description:
      'Mark attendance class-wise or section-wise with a single click. View monthly summaries, export detailed reports, and identify patterns — so teachers save time and administrators get clear insights into regularity.',
    highlights: ['One-tap daily marking', 'Monthly summary reports', 'Absentee alerts', 'Exportable attendance sheets'],
  },
  {
    image: Image3,
    title: 'Marks & Report Cards',
    subtitle: 'From exam scores to grade sheets — automated',
    badge: 'For Students & Parents',
    description:
      'Upload marks by subject and exam type, auto-calculate grades and percentages, and generate polished report cards ready to share with students and parents. Support for FA, SA, and custom exam patterns.',
    highlights: ['Multi-exam support', 'Auto grade calculation', 'Printable report cards', 'Subject-wise analytics'],
  },
  {
    image: Image4,
    title: 'Events & Announcements',
    subtitle: 'Keep the entire campus informed',
    badge: 'For Everyone',
    description:
      'Publish school events with dates, images, and descriptions. Broadcast announcements that reach teachers, students, and parents instantly — ensuring no one misses important updates.',
    highlights: ['Event calendar view', 'Image attachments', 'Push notifications', 'Targeted announcements'],
  },
  {
    image: Image5,
    title: 'Timetable & Scheduling',
    subtitle: 'Structured days, better learning',
    badge: 'For Schools',
    description:
      'Create and manage period-wise timetables for every class and section. Assign subjects and teachers to each slot, and let students and parents view the schedule anytime from their portal.',
    highlights: ['Period-wise slots', 'Teacher assignment', 'Student portal view', 'Easy drag-and-drop editing'],
  },
  {
    image: Image6,
    title: 'Fees & Finance',
    subtitle: 'Transparent fee tracking for every student',
    badge: 'For Schools & Parents',
    description:
      'Record fee payments, track pending dues, and generate receipts. Parents can view fee status from their portal, reducing follow-ups and bringing financial clarity to the administration.',
    highlights: ['Payment recording', 'Due date tracking', 'Receipt generation', 'Parent portal access'],
  },
  {
    image: Image7,
    title: 'Teacher Management',
    subtitle: 'Empower your teaching staff',
    badge: 'For Schools',
    description:
      'Onboard teachers with detailed profiles — qualifications, subjects, assigned classes, and contact information. Track workloads, manage substitutions, and give teachers their own portal to view schedules and upload marks.',
    highlights: ['Detailed teacher profiles', 'Subject & class mapping', 'Workload overview', 'Self-service teacher portal'],
  },
  {
    image: Image8,
    title: 'Homework Management',
    subtitle: 'Assign, track, and never miss a deadline',
    badge: 'For Teachers & Students',
    description:
      'Teachers can create homework assignments by class, section, and subject with clear due dates. Students and parents see pending tasks from the portal — keeping everyone on the same page and reducing missed submissions.',
    highlights: ['Class-wise assignment', 'Due date tracking', 'Subject tagging', 'Student portal visibility'],
  },
  {
    image: Image9,
    title: 'Achievements & Awards',
    subtitle: 'Celebrate every milestone',
    badge: 'For Students',
    description:
      'Recognize student accomplishments in academics, sports, arts, and extracurriculars. Maintain a digital trophy cabinet with categories, dates, and descriptions — giving students the recognition they deserve.',
    highlights: ['Category-wise awards', 'Academic & extracurricular', 'Bulk import support', 'Student profile integration'],
  },
  {
    image: Image10,
    title: 'Sports & Activities',
    subtitle: 'Beyond the classroom, building character',
    badge: 'For Students & Schools',
    description:
      'Manage sports programs with coach assignments, practice schedules, and team rosters. Track participation across activities and build a holistic view of every student — because education goes far beyond textbooks.',
    highlights: ['Program management', 'Coach & schedule tracking', 'Team rosters', 'Activity participation logs'],
  },
  {
    image: Image11,
    title: 'Notifications (Email & SMS)',
    subtitle: 'The right message, at the right time',
    badge: 'For Parents & Teachers',
    description:
      'Send targeted notifications to parents and teachers via email or SMS — fee reminders, homework alerts, report card availability, and event updates. Keep families engaged without manual follow-ups.',
    highlights: ['Email & SMS delivery', 'Fee reminders', 'Homework alerts', 'Report card notifications'],
  },
  {
    image: Image12,
    title: 'Transfer Certificates',
    subtitle: 'Official documents, generated instantly',
    badge: 'For Schools',
    description:
      'Generate professional transfer certificates with student details, conduct records, and serial numbers. Export as PDF, ready for print and signature — replacing hours of manual paperwork with a single click.',
    highlights: ['Auto-filled student data', 'Conduct & remarks', 'Serial number tracking', 'One-click PDF export'],
  },
]

const LandingShowcase = () => (
  <section id="features-detail" className="section">
    <div className="container feature-showcase">
      <div className="feature-showcase-intro">
        <h2>Everything your school needs, in one platform</h2>
        <p>
          Vidya Hub brings together student records, attendance, marks, events,
          timetables, fees, homework, achievements, and more into a single,
          beautifully designed system — so your school runs smoother and every
          stakeholder stays informed.
        </p>
        <div className="feature-showcase-stats">
          <div className="intro-stat">
            <strong>12+</strong>
            <span>Powerful Modules</span>
          </div>
          <div className="intro-stat">
            <strong>5</strong>
            <span>User Roles</span>
          </div>
          <div className="intro-stat">
            <strong>100%</strong>
            <span>Web Based</span>
          </div>
          <div className="intro-stat">
            <strong>24/7</strong>
            <span>Portal Access</span>
          </div>
        </div>
      </div>

      {featureSections.map((feature, index) => (
        <div
          key={feature.title}
          className={`feature-row ${index % 2 !== 0 ? 'reverse' : ''}`}
        >
          <div className="feature-row-image">
            <img src={feature.image} alt={feature.title} loading="lazy" />
          </div>
          <div className="feature-row-content">
            <div className="feature-row-top">
              <span className="feature-row-label">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="feature-row-badge">{feature.badge}</span>
            </div>
            <h3>{feature.title}</h3>
            <p className="feature-row-subtitle">{feature.subtitle}</p>
            <p className="feature-row-desc">{feature.description}</p>
            <ul className="feature-row-highlights">
              {feature.highlights.map((h) => (
                <li key={h}>
                  <span className="check-icon">✓</span> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      <div className="feature-showcase-cta">
        <h3>Ready to transform your school?</h3>
        <p>
          Join schools that trust Vidya Hub to simplify administration, improve
          communication, and help every student succeed.
        </p>
        <a className="btn primary" href="#auth">Get Started Free</a>
      </div>
    </div>
  </section>
)

export default LandingShowcase
