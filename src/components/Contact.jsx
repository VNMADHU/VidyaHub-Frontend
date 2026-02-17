import { contactInfo } from '../data/content'

const Contact = () => (
  <section id="contact" className="section">
    <div className="container">
      <h2>Contact</h2>
      <div className="grid two">
        <div className="card">
          <h3>Get in touch</h3>
          <p>Email: {contactInfo.email}</p>
          <p>Phone: {contactInfo.phone}</p>
          <p>Address: {contactInfo.address}</p>
        </div>
        <div className="card">
          <h3>Compatibility</h3>
          <p>This web application is fully responsive and optimized for mobile.</p>
          <p>No separate mobile app is required in Phase 1.</p>
        </div>
      </div>
    </div>
  </section>
)

export default Contact
