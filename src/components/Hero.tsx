import { heroStats } from '@/data/content'

const Hero = () => (
  <section id="home" className="hero">
    <div className="container hero-inner">
      <div className="hero-content">
        <span className="hero-badge">🏫 Trusted by 150+ Schools Across India</span>
        <h1>
          The Complete School
          <span className="hero-highlight"> Management </span>
          Platform
        </h1>
        <p>
          From admissions to report cards — Vidya Hub empowers schools,
          teachers, students, and parents with one unified platform to manage
          academics, attendance, fees, events, and communication effortlessly.
        </p>
        <div className="hero-actions">
          <a className="btn primary hero-btn" href="/login">
            Login →
          </a>
          <a className="btn outline hero-btn" href="#features-detail">
            Explore Features
          </a>
        </div>

      </div>
      <div className="hero-stats-card">
        <div className="hero-stats-header">
          <span className="hero-stats-dot live"></span>
          <span>Platform Overview</span>
        </div>
        {heroStats.map((stat) => (
          <div key={stat.label} className="hero-stat-row">
            <span className="hero-stat-label">{stat.label}</span>
            <span className="hero-stat-value">{stat.value}</span>
          </div>
        ))}
        <div className="hero-stats-footer">
          <span>📊 12+ Modules</span>
          <span>🔒 Secure & Reliable</span>
        </div>
      </div>
    </div>
  </section>
)

export default Hero
