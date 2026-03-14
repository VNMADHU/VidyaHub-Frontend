// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Send, Mail, MessageSquare, Users, ChevronDown, Trash2, CheckCircle, AlertCircle, Clock, RefreshCw, Paperclip, X } from 'lucide-react'
import apiClient from '@/services/api'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastContainer'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'

const NOTIFICATION_TYPES = [
  { value: 'announcement', label: '📣 Announcement', color: '#6366f1' },
  { value: 'event', label: '🎉 Event', color: '#8b5cf6' },
  { value: 'report', label: '📄 Report Card', color: '#0ea5e9' },
  { value: 'fee-reminder', label: '💰 Fee Reminder', color: '#f59e0b' },
  { value: 'homework', label: '📝 Homework', color: '#10b981' },
  { value: 'custom', label: '✉️ Custom', color: '#64748b' },
]

const CHANNELS = [
  { value: 'email', label: '📧 Email Only', icon: Mail },
  { value: 'sms', label: '💬 SMS Only', icon: MessageSquare },
  { value: 'both', label: '📧+💬 Email & SMS', icon: Send },
]

const NotificationsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  // Compose form state
  const [form, setForm] = useState({
    type: 'announcement',
    channel: 'email',
    subject: '',
    message: '',
    audience: 'all-parents',
    classId: '',
    studentId: '',
  })
  const [sending, setSending] = useState(false)

  // Data
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [history, setHistory] = useState([])
  const [recipientPreview, setRecipientPreview] = useState({ count: 0, emailCount: 0, phoneCount: 0 })
  const [search, setSearch] = useState('')

  // Tabs
  const [tab, setTab] = useState('compose') // compose | whatsapp | history

  // ── WhatsApp State ──────────────────────────────────────
  const [waStatus, setWaStatus]               = useState('disconnected') // disconnected|connecting|qr|ready
  const [waAudience, setWaAudience]           = useState('all-parents')
  const [waClassId, setWaClassId]             = useState('')
  const [waCustomNumbers, setWaCustomNumbers] = useState('') // newline-separated, never saved
  const [waMessage, setWaMessage]             = useState('')
  const [waAttachment, setWaAttachment]       = useState(null) // { name, b64, mime }
  const [waSending, setWaSending]             = useState(false)
  const [waPreview, setWaPreview]             = useState([])  // { name, phone }[]
  const waFileRef = useRef(null)
  const waPollerRef = useRef(null)

  // Poll WhatsApp status every 3s when connecting or qr
  const pollWaStatus = useCallback(async () => {
    try {
      const s = await apiClient.waStatus()
      setWaStatus(s.status)
      if (s.status === 'ready' || s.status === 'disconnected') {
        clearInterval(waPollerRef.current)
      }
    } catch { /* backend may not have whatsapp route yet */ }
  }, [])

  useEffect(() => {
    if (tab === 'whatsapp') {
      pollWaStatus()
      waPollerRef.current = setInterval(pollWaStatus, 3000)
    } else {
      clearInterval(waPollerRef.current)
    }
    return () => clearInterval(waPollerRef.current)
  }, [tab, pollWaStatus])

  // Reload recipient preview when whatsapp audience changes
  useEffect(() => {
    if (tab !== 'whatsapp') return
    if (waAudience === 'custom') { setWaPreview([]); return }
    const aud = waAudience === 'class' ? (waClassId ? `class:${waClassId}` : '') : waAudience
    if (!aud) { setWaPreview([]); return }
    apiClient.waRecipients(aud).then((r) => setWaPreview(r.contacts || [])).catch(() => {})
  }, [waAudience, waClassId, tab])

  const handleWaConnect = async () => {
    setWaStatus('connecting')
    try {
      await apiClient.waConnect()
      waPollerRef.current = setInterval(pollWaStatus, 3000)
    } catch (err) {
      toast.error(err.message || 'Failed to start WhatsApp')
      setWaStatus('disconnected')
    }
  }

  const handleWaDisconnect = async () => {
    try {
      await apiClient.waDisconnect()
      setWaStatus('disconnected')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleWaFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result.split(',')[1]
      setWaAttachment({ name: file.name, b64, mime: file.type })
    }
    reader.readAsDataURL(file)
  }

  const handleWaSend = async () => {
    if (!waMessage.trim()) return toast.error('Please enter a message')
    if (waAudience === 'custom' && !waCustomNumbers.trim()) return toast.error('Please enter at least one phone number')
    if (waAudience === 'class' && !waClassId) return toast.error('Please select a class')

    const targetCount = waAudience === 'custom'
      ? waCustomNumbers.split('\n').filter((n) => n.trim()).length
      : waPreview.length

    const ok = await confirm({
      title: 'Send WhatsApp Messages?',
      message: `Send to ${targetCount} number(s) via WhatsApp. Continue?`,
      confirmText: 'Send',
      confirmVariant: 'success',
    })
    if (!ok) return

    setWaSending(true)
    try {
      const audience = waAudience === 'class' ? `class:${waClassId}` : waAudience
      const customNumbers = waAudience === 'custom'
        ? waCustomNumbers.split('\n').map((n) => n.trim()).filter(Boolean)
        : undefined

      const result = await apiClient.waSend({
        audience,
        customNumbers,
        message: waMessage,
        attachmentB64: waAttachment?.b64,
        attachmentMime: waAttachment?.mime,
        attachmentName: waAttachment?.name,
      })
      toast.success(result.message || 'WhatsApp messages sent!')
      setWaMessage('')
      setWaAttachment(null)
      setWaCustomNumbers('')
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp messages')
    } finally {
      setWaSending(false)
    }
  }

  // Load classes + history on mount
  useEffect(() => {
    apiClient.listClasses().then((r) => setClasses(r.data || r)).catch(() => {})
    loadHistory()
  }, [])

  // Load students when class changes
  useEffect(() => {
    if (form.audience === 'student') {
      apiClient.listStudents().then((r) => setStudents(r.data || r)).catch(() => {})
    }
  }, [form.audience])

  // Preview recipient count when audience changes
  useEffect(() => {
    const audience = getAudienceValue()
    if (!audience) return
    apiClient.getRecipientsCount(audience).then((r) => setRecipientPreview(r)).catch(() => {})
  }, [form.audience, form.classId, form.studentId])

  const loadHistory = () => {
    apiClient.listNotifications().then((r) => setHistory(r.data || r)).catch(() => {})
  }

  const getAudienceValue = () => {
    if (form.audience === 'all-parents') return 'all-parents'
    if (form.audience === 'class' && form.classId) return `class:${form.classId}`
    if (form.audience === 'student' && form.studentId) return `student:${form.studentId}`
    return ''
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSend = async () => {
    if (!form.subject.trim()) return toast.error('Please enter a subject')
    if (!form.message.trim()) return toast.error('Please enter a message')

    const audience = getAudienceValue()
    if (!audience) return toast.error('Please select an audience')

    const ok = await confirm({
      title: 'Send Notification?',
      message: `This will send ${form.channel === 'both' ? 'email & SMS' : form.channel} to ${recipientPreview.count} recipient(s). Continue?`,
      confirmText: 'Send',
      confirmVariant: 'success',
    })
    if (!ok) return

    setSending(true)
    try {
      const result = await apiClient.sendNotification({
        type: form.type,
        channel: form.channel,
        subject: form.subject,
        message: form.message,
        audience,
      })
      toast.success(result.message || 'Notification sent!')
      setForm((prev) => ({ ...prev, subject: '', message: '' }))
      loadHistory()
    } catch (err) {
      toast.error(err.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Log?', message: 'Remove this notification log entry?' })
    if (!ok) return
    try {
      await apiClient.deleteNotification(String(id))
      toast.success('Log entry deleted')
      loadHistory()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Filter history
  const filteredHistory = useMemo(() => {
    if (!search) return history
    const q = search.toLowerCase()
    return history.filter(
      (n) =>
        n.subject?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q) ||
        n.audience?.toLowerCase().includes(q)
    )
  }, [history, search])

  const { paginatedItems: paginatedHistory, currentPage, totalPages, totalItems, goToPage } = usePagination(filteredHistory)

  const statusIcon = (status) => {
    if (status === 'sent') return <CheckCircle size={14} style={{ color: '#10b981' }} />
    if (status === 'partial') return <AlertCircle size={14} style={{ color: '#f59e0b' }} />
    return <AlertCircle size={14} style={{ color: '#ef4444' }} />
  }

  const typeInfo = (type) => NOTIFICATION_TYPES.find((t) => t.value === type) || NOTIFICATION_TYPES[5]

  // ── Inline styles ───────────────────────────────────────
  const cardStyle = {
    background: 'var(--surface)',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid var(--border)',
  }
  const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text)' }
  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    background: 'var(--surface)',
    color: 'var(--text)',
    boxSizing: 'border-box',
  }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const chipStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.85rem',
    borderRadius: '20px',
    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
    background: active ? 'var(--primary-alpha, rgba(99,102,241,0.1))' : 'var(--surface)',
    color: active ? 'var(--primary)' : 'var(--text)',
    fontWeight: active ? 600 : 400,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  })
  const previewBoxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--surface-alt, #f8fafc)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: 'var(--muted)',
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">📨 Notifications</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
            Send announcements, event info, fee reminders & more to parents via Email or SMS
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setTab('compose')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: tab === 'compose' ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: tab === 'compose' ? 'var(--primary)' : 'var(--surface)',
            color: tab === 'compose' ? '#fff' : 'var(--text)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          ✍️ Compose
        </button>
        <button
          onClick={() => setTab('whatsapp')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: tab === 'whatsapp' ? '2px solid #25d366' : '1px solid var(--border)',
            background: tab === 'whatsapp' ? '#25d366' : 'var(--surface)',
            color: tab === 'whatsapp' ? '#fff' : 'var(--text)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          💬 WhatsApp
        </button>
        <button
          onClick={() => setTab('history')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: tab === 'history' ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: tab === 'history' ? 'var(--primary)' : 'var(--surface)',
            color: tab === 'history' ? '#fff' : 'var(--text)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          📋 History ({history.length})
        </button>
      </div>

      {/* ── Compose Tab ───────────────────────────────────── */}
      {tab === 'compose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Notification Type */}
          <div style={cardStyle}>
            <label style={labelStyle}>Notification Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {NOTIFICATION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleChange('type', t.value)}
                  style={chipStyle(form.type === t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div style={cardStyle}>
            <label style={labelStyle}>Send Via</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange('channel', c.value)}
                  style={chipStyle(form.channel === c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div style={cardStyle}>
            <label style={labelStyle}>Send To</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button type="button" onClick={() => handleChange('audience', 'all-parents')} style={chipStyle(form.audience === 'all-parents')}>
                <Users size={14} /> All Parents
              </button>
              <button type="button" onClick={() => handleChange('audience', 'class')} style={chipStyle(form.audience === 'class')}>
                🏫 By Class
              </button>
              <button type="button" onClick={() => handleChange('audience', 'student')} style={chipStyle(form.audience === 'student')}>
                👤 Specific Student
              </button>
            </div>

            {form.audience === 'class' && (
              <select style={selectStyle} value={form.classId} onChange={(e) => handleChange('classId', e.target.value)}>
                <option value="">— Select Class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {form.audience === 'student' && (
              <select style={selectStyle} value={form.studentId} onChange={(e) => handleChange('studentId', e.target.value)}>
                <option value="">— Select Student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
                ))}
              </select>
            )}

            {/* Recipient preview */}
            <div style={{ ...previewBoxStyle, marginTop: '0.75rem' }}>
              <Users size={16} />
              <span>
                <strong>{recipientPreview.count}</strong> recipient(s) found
                {recipientPreview.emailCount > 0 && ` • ${recipientPreview.emailCount} with email`}
                {recipientPreview.phoneCount > 0 && ` • ${recipientPreview.phoneCount} with phone`}
              </span>
            </div>
          </div>

          {/* Subject & Message */}
          <div style={cardStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Subject *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. Parent-Teacher Meeting on 25th Feb"
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Message *</label>
              <textarea
                style={{ ...inputStyle, minHeight: '140px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Dear {{name}},&#10;&#10;Write your message here...&#10;&#10;Use {{name}} to personalize with parent's name."
                value={form.message}
                onChange={(e) => handleChange('message', e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
                💡 Use <code style={{ background: 'var(--surface-alt)', padding: '0 4px', borderRadius: 4 }}>{'{{name}}'}</code> to auto-insert parent's name
              </p>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 2rem',
              borderRadius: '10px',
              border: 'none',
              background: sending ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: sending ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              transition: 'all 0.3s',
              alignSelf: 'flex-start',
            }}
          >
            <Send size={18} />
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      )}

      {/* ── WhatsApp Tab ──────────────────────────────────── */}
      {tab === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Connection Status Banner */}
          <div style={{
            ...cardStyle,
            border: waStatus === 'ready' ? '1px solid #25d366' : waStatus === 'qr' || waStatus === 'connecting' ? '1px solid #f59e0b' : '1px solid var(--border)',
            background: waStatus === 'ready' ? 'rgba(37,211,102,0.06)' : 'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem' }}>
                  {waStatus === 'ready' ? '🟢' : waStatus === 'qr' ? '🟡' : waStatus === 'connecting' ? '🟡' : '🔴'}
                </span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                    {waStatus === 'ready' && 'WhatsApp Connected'}
                    {waStatus === 'qr' && 'Scan QR Code to Link WhatsApp'}
                    {waStatus === 'connecting' && 'Starting WhatsApp...'}
                    {waStatus === 'disconnected' && 'WhatsApp Not Connected'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {waStatus === 'ready' && 'You can now send WhatsApp messages to parents & staff'}
                    {waStatus === 'qr' && 'Open WhatsApp on your phone → Linked Devices → Link a Device → Scan QR'}
                    {waStatus === 'connecting' && 'Please wait while the WhatsApp session initializes...'}
                    {waStatus === 'disconnected' && 'Click Connect to link your WhatsApp account'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {waStatus === 'disconnected' && (
                  <button onClick={handleWaConnect} style={{ padding: '0.5rem 1.25rem', background: '#25d366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                    📲 Connect WhatsApp
                  </button>
                )}
                {(waStatus === 'connecting' || waStatus === 'qr') && (
                  <button onClick={pollWaStatus} style={{ padding: '0.45rem 0.9rem', background: 'var(--surface-alt,#f1f5f9)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                )}
                {waStatus === 'ready' && (
                  <button onClick={handleWaDisconnect} style={{ padding: '0.45rem 0.9rem', background: 'var(--surface-alt,#f1f5f9)', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Browser-window QR instruction */}
            {waStatus === 'qr' && (
              <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📱</span>
                <div>
                  <p style={{ margin: '0 0 0.3rem', fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>Scan the QR code in the browser window that just opened</p>
                  <p style={{ margin: 0, color: '#15803d', fontSize: '0.82rem' }}>Open WhatsApp on your phone → tap ⋮ or Settings → Linked Devices → Link a Device, then scan the QR.</p>
                </div>
              </div>
            )}
            {waStatus === 'connecting' && (
              <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                ⏳ Opening browser window... This may take 15–30 seconds on first run.
              </div>
            )}
          </div>

          {/* Compose WhatsApp Message (only when ready) */}
          {waStatus === 'ready' && (<>
            {/* Audience */}
            <div style={cardStyle}>
              <label style={labelStyle}>Send To</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[
                  { value: 'all-parents', label: '👨‍👩‍👧 All Parents' },
                  { value: 'all-teachers', label: '👨‍🏫 All Teachers' },
                  { value: 'class', label: '🏫 By Class' },
                  { value: 'custom', label: '📱 Custom Numbers' },
                ].map((a) => (
                  <button key={a.value} type="button" onClick={() => setWaAudience(a.value)} style={chipStyle(waAudience === a.value)}>
                    {a.label}
                  </button>
                ))}
              </div>

              {waAudience === 'class' && (
                <select style={selectStyle} value={waClassId} onChange={(e) => setWaClassId(e.target.value)}>
                  <option value="">— Select Class —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              {waAudience === 'custom' && (
                <div>
                  <textarea
                    style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                    placeholder={'Enter phone numbers (one per line)\n10-digit numbers get +91 auto-added.\nFor other countries include code, e.g.:\n+447979733801  or  447979733801'}
                    value={waCustomNumbers}
                    onChange={(e) => setWaCustomNumbers(e.target.value)}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    ⚠️ These numbers are used for this send only and are not saved to the database.
                  </p>
                </div>
              )}

              {/* Recipient preview */}
              {waAudience !== 'custom' && (
                <div style={{ ...previewBoxStyle, marginTop: '0.75rem' }}>
                  <Users size={16} />
                  <span><strong>{waPreview.length}</strong> phone number(s) found</span>
                  {waPreview.length > 0 && waPreview.length <= 5 && (
                    <span style={{ color: 'var(--text)', fontSize: '0.8rem' }}>
                      — {waPreview.slice(0, 5).map((r) => r.name).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div style={cardStyle}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Message *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder={'Dear Parent,\n\nWrite your WhatsApp message here...'}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                />
              </div>

              {/* Attachment */}
              <div>
                <label style={labelStyle}>Attachment (optional)</label>
                <input ref={waFileRef} type="file" accept="image/*,application/pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleWaFile} />
                {waAttachment ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(37,211,102,0.08)', border: '1px solid #86efac', borderRadius: '8px' }}>
                    <Paperclip size={16} style={{ color: '#25d366' }} />
                    <span style={{ fontSize: '0.85rem', flex: 1 }}>{waAttachment.name}</span>
                    <button onClick={() => setWaAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => waFileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--surface-alt,#f8fafc)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <Paperclip size={14} /> Attach Image / PDF
                  </button>
                )}
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleWaSend}
              disabled={waSending}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem 2rem', borderRadius: '10px', border: 'none',
                background: waSending ? '#94a3b8' : 'linear-gradient(135deg, #25d366, #128c7e)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: waSending ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                alignSelf: 'flex-start',
              }}
            >
              <Send size={18} />
              {waSending ? 'Sending...' : '💬 Send WhatsApp'}
            </button>
          </>)}
        </div>
      )}

      {/* ── History Tab ───────────────────────────────────── */}
      {tab === 'history' && (
        <>
          <div style={{ marginBottom: '1rem', maxWidth: '350px' }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search history..." />
          </div>

          {filteredHistory.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              <Send size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Channel</th>
                      <th>Subject</th>
                      <th>Audience</th>
                      <th>Delivered</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((n) => {
                      const ti = typeInfo(n.type)
                      return (
                        <tr key={n.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <br />
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                              {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', background: `${ti.color}18`, color: ti.color, fontWeight: 600 }}>
                              {ti.label}
                            </span>
                          </td>
                          <td style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600 }}>
                            {n.channel === 'email' ? '📧' : n.channel === 'sms' ? '💬' : '📧💬'} {n.channel}
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.subject}</td>
                          <td style={{ fontSize: '0.85rem' }}>{n.audience}</td>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ color: '#10b981' }}>{n.totalSent}</span>
                            {n.totalFailed > 0 && <span style={{ color: '#ef4444' }}> / {n.totalFailed} ✗</span>}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {statusIcon(n.status)} {n.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon danger" onClick={() => handleDelete(n.id)} aria-label="Delete">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={totalItems}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default NotificationsPage
