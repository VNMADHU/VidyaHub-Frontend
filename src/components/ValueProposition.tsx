const benefits = [
  {
    icon: '⏱️',
    title: 'Save 10+ Hours Every Week',
    desc: 'Automate attendance, report cards, fee tracking, and notifications. What used to take days now takes minutes — giving your staff more time to focus on students.',
  },
  {
    icon: '📊',
    title: 'Real-Time Insights at a Glance',
    desc: 'Dashboards that show attendance rates, fee collection, student performance, and upcoming events — all in one place, updated in real time.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Keep Parents in the Loop',
    desc: 'Parents get instant visibility into their child\'s attendance, marks, homework, and fee dues through a dedicated portal — reducing calls to the school office.',
  },
  {
    icon: '📱',
    title: 'Works on Any Device',
    desc: 'Access Vidya Hub from a desktop, tablet, or mobile phone. No app download needed — just open a browser and everything works beautifully.',
  },
  {
    icon: '🔒',
    title: 'Secure & Role-Based Access',
    desc: 'Each user sees only what they need. Admins, teachers, students, and parents have separate logins with carefully controlled permissions.',
  },
  {
    icon: '🖥️',
    title: 'Works Offline Too',
    desc: 'For schools without reliable internet, the desktop version runs completely offline with a built-in database — no cloud, no connectivity required.',
  },
  {
    icon: '📁',
    title: 'Paperless Administration',
    desc: 'Generate transfer certificates, report cards, attendance sheets, and fee receipts digitally. Reduce paper usage and eliminate manual filing.',
  },
  {
    icon: '🚀',
    title: 'Up and Running in a Day',
    desc: 'Simple onboarding — import students via CSV, set up classes, and you\'re live. No IT team required, no lengthy training sessions.',
  },
]

const stats = [
  { value: '150+', label: 'Schools Using Vidya Hub' },
  { value: '50,000+', label: 'Students Managed' },
  { value: '10 hrs', label: 'Saved Per School Per Week' },
  { value: '99.9%', label: 'System Uptime' },
]

const ValueProposition = () => (
  <>
    {/* ── Impact Stats Strip ── */}
    <section className="vp-stats-strip">
      <div className="container">
        <div className="vp-stats-row">
          {stats.map((s) => (
            <div key={s.label} className="vp-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Why Vidya Hub ── */}
    <section id="benefits" className="section vp-benefits-section">
      <div className="container">
        <div className="vp-section-header">
          <span className="vp-section-tag">WHY VIDYA HUB</span>
          <h2>Built for the way schools actually work</h2>
          <p>
            We talked to hundreds of school administrators, teachers, and parents
            before building Vidya Hub. Every feature solves a real problem that
            schools face every single day.
          </p>
        </div>
        <div className="vp-benefits-grid">
          {benefits.map((b) => (
            <div key={b.title} className="vp-benefit-card">
              <div className="vp-benefit-icon">{b.icon}</div>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Who It's For ── */}
    <section className="section vp-roles-section">
      <div className="container">
        <div className="vp-section-header">
          <span className="vp-section-tag">FOR EVERYONE IN YOUR SCHOOL</span>
          <h2>One platform, every stakeholder covered</h2>
        </div>
        <div className="vp-roles-grid">
          <div className="vp-role-card admin">
            <div className="vp-role-icon">🏫</div>
            <h3>School Admins</h3>
            <p>Full control over all modules — students, staff, fees, reports, and settings. Bird's-eye view of the entire school.</p>
            <ul>
              <li>✓ School-wide dashboard</li>
              <li>✓ Fee & expense management</li>
              <li>✓ Staff & teacher oversight</li>
              <li>✓ Document generation</li>
            </ul>
          </div>
          <div className="vp-role-card teacher">
            <div className="vp-role-icon">👨‍🏫</div>
            <h3>Teachers</h3>
            <p>Mark attendance, upload marks, assign homework, and communicate with students — all from a simple teacher portal.</p>
            <ul>
              <li>✓ Daily attendance marking</li>
              <li>✓ Marks & grade entry</li>
              <li>✓ Homework assignment</li>
              <li>✓ Personal timetable view</li>
            </ul>
          </div>
          <div className="vp-role-card student">
            <div className="vp-role-icon">🎓</div>
            <h3>Students</h3>
            <p>Access marks, homework, timetable, attendance records, and achievements from a personal student portal.</p>
            <ul>
              <li>✓ View report cards</li>
              <li>✓ Track homework</li>
              <li>✓ See announcements</li>
              <li>✓ Check attendance</li>
            </ul>
          </div>
          <div className="vp-role-card parent">
            <div className="vp-role-icon">👨‍👩‍👧</div>
            <h3>Parents</h3>
            <p>Stay connected to your child's school life — fee dues, attendance, marks, and events — without calling the school office.</p>
            <ul>
              <li>✓ Fee status & dues</li>
              <li>✓ Child's attendance</li>
              <li>✓ Marks & progress</li>
              <li>✓ School announcements</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* ── Testimonials ── */}
    <section className="section vp-testimonials-section">
      <div className="container">
        <div className="vp-section-header">
          <span className="vp-section-tag">WHAT SCHOOLS SAY</span>
          <h2>Trusted by schools across India</h2>
        </div>
        <div className="vp-testimonials-grid">
          <div className="vp-testimonial-card">
            <div className="vp-testimonial-stars">★★★★★</div>
            <p>"We used to spend 3 days generating report cards. With Vidya Hub, we do it in 2 hours. The time savings alone made it worth every rupee."</p>
            <div className="vp-testimonial-author">
              <div className="vp-testimonial-avatar">SM</div>
              <div>
                <strong>Suresh Mehta</strong>
                <span>Principal, Sunrise English School, Pune</span>
              </div>
            </div>
          </div>
          <div className="vp-testimonial-card">
            <div className="vp-testimonial-stars">★★★★★</div>
            <p>"Parents used to call 10 times a day asking about fees. Now they check the parent portal themselves. Our admin staff is finally free to do meaningful work."</p>
            <div className="vp-testimonial-author">
              <div className="vp-testimonial-avatar">PR</div>
              <div>
                <strong>Priya Rao</strong>
                <span>School Administrator, Greenfield Academy, Hyderabad</span>
              </div>
            </div>
          </div>
          <div className="vp-testimonial-card">
            <div className="vp-testimonial-stars">★★★★★</div>
            <p>"The offline desktop version is perfect for us. Our internet is unreliable but Vidya Hub runs flawlessly every single day without any connectivity."</p>
            <div className="vp-testimonial-author">
              <div className="vp-testimonial-avatar">AK</div>
              <div>
                <strong>Anand Kumar</strong>
                <span>Director, Vidyasagar High School, Rural Karnataka</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Pricing ── */}
    <section id="pricing" className="section vp-pricing-section">
      <div className="container">
        <div className="vp-section-header">
          <span className="vp-section-tag">SIMPLE PRICING</span>
          <h2>Affordable for every school</h2>
          <p>No hidden charges. No per-user fees. One flat price for unlimited access.</p>
        </div>
        <div className="vp-pricing-grid">
          <div className="vp-pricing-card">
            <div className="vp-pricing-tier">Web — Online</div>
            {/* <div className="vp-pricing-price">₹4,999<span>/year</span></div> */}
            <p className="vp-pricing-desc">Perfect for schools with reliable internet. Access from any browser, any device.</p>
            <ul className="vp-pricing-features">
              <li>✓ All 15+ modules included</li>
              <li>✓ Unlimited students & teachers</li>
              <li>✓ Student & parent portals</li>
              <li>✓ Cloud-based PostgreSQL</li>
              <li>✓ Email & SMS notifications</li>
              <li>✓ Free setup & onboarding</li>
            </ul>
            <a href="#auth" className="btn primary vp-pricing-btn">Get Started Free</a>
          </div>
          <div className="vp-pricing-card">
            <div className="vp-pricing-tier">Web + Mobile Apps</div>
            {/* <div className="vp-pricing-price">₹7,999<span>/year</span></div> */}
            <p className="vp-pricing-desc">Full web access plus dedicated Android & iOS apps for teachers, students, and parents.</p>
            <ul className="vp-pricing-features">
              <li>✓ Everything in Web — Online</li>
              <li>✓ Android & iOS mobile apps</li>
              <li>✓ Push notifications</li>
              <li>✓ Mobile attendance marking</li>
              <li>✓ Parent communication app</li>
              <li>✓ Offline mobile sync</li>
            </ul>
            <a href="#contact" className="btn primary vp-pricing-btn">Contact Us</a>
          </div>
          <div className="vp-pricing-card featured">
            <div className="vp-pricing-badge">MOST POPULAR</div>
            <div className="vp-pricing-tier">Desktop — Offline</div>
            {/* <div className="vp-pricing-price">₹2,999<span>/year</span></div> */}
            <p className="vp-pricing-desc">Ideal for schools in areas with poor connectivity. Runs completely offline.</p>
            <ul className="vp-pricing-features">
              <li>✓ All 15+ modules included</li>
              <li>✓ Unlimited students & teachers</li>
              <li>✓ Single installer (.exe / .dmg)</li>
              <li>✓ Built-in SQLite database</li>
              <li>✓ No internet required</li>
              <li>✓ Free lifetime updates</li>
            </ul>
            <a href="#contact" className="btn primary vp-pricing-btn">Contact Us</a>
          </div>
        </div>
        <p className="vp-pricing-note">
          🎓 Special discounts available for government schools and NGO-run institutions. <a href="#contact">Contact us</a> to learn more.
        </p>
      </div>
    </section>
  </>
)

export default ValueProposition
