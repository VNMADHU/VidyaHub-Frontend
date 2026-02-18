// @ts-nocheck
import { useState } from 'react'

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'school' ? 'active' : ''}`}
          onClick={() => setActiveTab('school')}
        >
          School
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'profile' && (
          <div className="settings-card">
            <h3>Profile Settings</h3>
            <form className="form-grid">
              <input type="text" placeholder="Full Name" defaultValue="Admin User" />
              <input type="email" placeholder="Email" defaultValue="admin@vidyahub.edu" />
              <input type="tel" placeholder="Phone Number" />
              <input type="text" placeholder="Designation" />
              <button type="submit" className="btn primary">
                Update Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === 'school' && (
          <div className="settings-card">
            <h3>School Settings</h3>
            <form className="form-grid">
              <input type="text" placeholder="School Name" defaultValue="Demo School" />
              <select defaultValue="CBSE">
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State">State Board</option>
              </select>
              <input type="text" placeholder="School Code" />
              <input type="text" placeholder="Academic Year" defaultValue="2025-26" />
              <div style={{ gridColumn: '1 / -1' }}>
                <label>School Logo</label>
                <input type="file" accept="image/*" />
              </div>
              <button type="submit" className="btn primary">
                Update Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="settings-card">
            <h3>Security Settings</h3>
            <form className="form-grid">
              <input type="password" placeholder="Current Password" />
              <input type="password" placeholder="New Password" />
              <input type="password" placeholder="Confirm New Password" />
              <button type="submit" className="btn primary">
                Change Password
              </button>
            </form>
            <div style={{ marginTop: '2rem' }}>
              <h4>Two-Factor Authentication</h4>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span>Enable 2FA</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-card">
            <h3>Notification Preferences</h3>
            <div className="notification-settings">
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>Email Notifications</span>
              </label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>SMS Notifications</span>
              </label>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span>Push Notifications</span>
              </label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>Attendance Alerts</span>
              </label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span>Exam Reminders</span>
              </label>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span>Event Updates</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
