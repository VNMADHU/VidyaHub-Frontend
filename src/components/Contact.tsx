import { useState } from 'react'
import { contactInfo } from '@/data/content'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const EMPTY = { schoolName: '', contactName: '', phone: '', email: '', plan: '' }

const Contact = () => {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.schoolName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      setErrorMsg('Please fill in School Name, Your Name, and Phone Number.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')
      setStatus('success')
      setForm(EMPTY)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
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

              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#10b981' }}>Request Sent!</h4>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                    Thank you! We'll contact you within 24 hours to schedule your demo.
                  </p>
                  <button
                    className="btn outline"
                    style={{ marginTop: '1.25rem', fontSize: '0.85rem' }}
                    onClick={() => setStatus('idle')}
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <>
                  <div className="vp-form-group">
                    <input
                      type="text"
                      placeholder="School Name *"
                      className="vp-form-input"
                      value={form.schoolName}
                      onChange={set('schoolName')}
                    />
                  </div>
                  <div className="vp-form-group">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      className="vp-form-input"
                      value={form.contactName}
                      onChange={set('contactName')}
                    />
                  </div>
                  <div className="vp-form-group">
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      className="vp-form-input"
                      value={form.phone}
                      onChange={set('phone')}
                    />
                  </div>
                  <div className="vp-form-group">
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="vp-form-input"
                      value={form.email}
                      onChange={set('email')}
                    />
                  </div>
                  <div className="vp-form-group">
                    <select
                      className="vp-form-input"
                      value={form.plan}
                      onChange={set('plan')}
                    >
                      <option value="">Preferred Plan</option>
                      <option value="web">Web — Online</option>
                      <option value="mobile">Web + Mobile Apps</option>
                      <option value="desktop">Desktop — Offline</option>
                      <option value="both">Multiple Plans</option>
                    </select>
                  </div>
                  {status === 'error' && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                      ⚠ {errorMsg}
                    </p>
                  )}
                  <button
                    className="btn primary"
                    style={{ width: '100%', padding: '0.85rem', opacity: status === 'loading' ? 0.7 : 1 }}
                    onClick={handleSubmit}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Sending…' : 'Request Demo →'}
                  </button>
                  <p className="vp-form-note">🔒 We never share your information. No spam, ever.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
