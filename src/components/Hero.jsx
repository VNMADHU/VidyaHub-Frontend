import { heroStats } from '../data/content'

const Hero = () => (
  <section id="home" className="hero">
    <div className="container hero-inner">
      <div className="hero-content">
        <h1>Manage academics, attendance, and communication in one place.</h1>
        <p>
          Vidya Hub is a responsive web application for schools and colleges to
          manage students, teachers, marks, attendance, events, and
          announcements.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="#auth">
            Get Started
          </a>
          <a className="btn outline" href="#features">
            View Features
          </a>
        </div>
        <div className="portal-access-strip">
          <span className="portal-access-label">Quick Access</span>
          <div className="portal-access-links">
            <a className="portal-link student" href="/student-login">
              <span className="portal-link-icon">🎓</span>
              <span className="portal-link-text">Student Portal</span>
              <span className="portal-link-arrow">→</span>
            </a>
            <a className="portal-link teacher" href="/teacher-login">
              <span className="portal-link-icon">👨‍🏫</span>
              <span className="portal-link-text">Teacher Portal</span>
              <span className="portal-link-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
      <div className="hero-card">
        {heroStats.map((stat) => (
          <div key={stat.label} className="stat">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Hero
