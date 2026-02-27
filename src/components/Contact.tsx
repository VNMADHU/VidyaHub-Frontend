import { contactInfo } from '@/data/content'

const Contact = () => (
  <section id="contact" className="section vp-contact-section">
    <div className="container">
      <div className="vp-contact-inner">
        <div className="vp-contact-left">
          <span className="vp-section-tag">GET IN TOUCH</span>
          <h2>Let's get your school started</h2>
          <p>
            Have questions about pricing, features, or the offline desktop version?
            Our team is happy to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="vp-contact-items">
            <div className="vp-contact-item">
              <span className="vp-contact-item-icon">📧</span>
              <div>
                <strong>Email Us</strong>
                <span>{contactInfo.email}</span>
              </div>
            </div>
            <div className="vp-contact-item">
              <span className="vp-contact-item-icon">📞</span>
              <div>
                <strong>Call Us</strong>
                <span>{contactInfo.phone}</span>
              </div>
            </div>
            <div className="vp-contact-item">
              <span className="vp-contact-item-icon">📍</span>
              <div>
                <strong>Address</strong>
                <span>{contactInfo.address}</span>
              </div>
            </div>
            <div className="vp-contact-item">
              <span className="vp-contact-item-icon">🖥️</span>
              <div>
                <strong>Works on</strong>
                <span>Web browser · Windows · macOS · Mobile</span>
              </div>
            </div>
          </div>
        </div>
        <div className="vp-contact-right">
          <div className="vp-contact-form-card">
            <h3>Request a Free Demo</h3>
            <p>We'll walk you through Vidya Hub personally — no commitment required.</p>
            <div className="vp-form-group">
              <input type="text" placeholder="School Name" className="vp-form-input" />
            </div>
            <div className="vp-form-group">
              <input type="text" placeholder="Your Name" className="vp-form-input" />
            </div>
            <div className="vp-form-group">
              <input type="tel" placeholder="Phone Number" className="vp-form-input" />
            </div>
            <div className="vp-form-group">
              <input type="email" placeholder="Email Address" className="vp-form-input" />
            </div>
            <div className="vp-form-group">
              <select className="vp-form-input">
                <option value="">Preferred Plan</option>
                <option value="web">Web — Online (₹4,999/yr)</option>
                <option value="desktop">Desktop — Offline (₹2,999/yr)</option>
                <option value="both">Both Plans</option>
              </select>
            </div>
            <button
              className="btn primary"
              style={{ width: '100%', padding: '0.85rem' }}
              onClick={() => alert('Thank you! We will contact you within 24 hours.')}
            >
              Request Demo →
            </button>
            <p className="vp-form-note">🔒 We never share your information. No spam, ever.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Contact
