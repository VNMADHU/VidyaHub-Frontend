// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Send, MessageSquare, Users, ChevronDown, Trash2, CheckCircle, AlertCircle, Clock, RefreshCw, Paperclip, X } from 'lucide-react'
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
  { value: 'sms', label: '💬 SMS Only', icon: MessageSquare },
]

const NotificationsPage = () => {
  const { confirm } = useConfirm()
  const toast = useToast()

  // Compose form state
  const [form, setForm] = useState({
    type: 'announcement',
    channel: 'sms',
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
  const [waAttachments, setWaAttachments]     = useState([])   // [{ name, b64, mime }, ...]
  const [waSending, setWaSending]             = useState(false)
  const [waPreview, setWaPreview]             = useState([])  // { name, phone }[]
  const [waContacts, setWaContacts]           = useState([])   // { name, number }[] — from WA address book
  const [waContactSearch, setWaContactSearch] = useState('')   // search filter for contact picker
  const [waSelectedContacts, setWaSelectedContacts] = useState([]) // selected { name, number }[]
  const [waContactsLoading, setWaContactsLoading] = useState(false)
  const [waShowAddForm, setWaShowAddForm]     = useState(false)  // toggle add-contact inline form
  const [waNewName, setWaNewName]             = useState('')
  const [waNewNumber, setWaNewNumber]         = useState('')
  const [waAddingSaving, setWaAddingSaving]   = useState(false)
  const [waShowCsvImport, setWaShowCsvImport] = useState(false)  // toggle CSV import panel
  const [waCsvPreview, setWaCsvPreview]       = useState([])     // [{ name, number }] parsed rows
  const [waCsvImporting, setWaCsvImporting]   = useState(false)
  const [waCsvResult, setWaCsvResult]         = useState(null)   // { saved, failed } after import
  const waCsvFileRef = useRef(null)
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
    if (waAudience === 'custom' || waAudience === 'wa-contacts') { setWaPreview([]); return }
    const aud = waAudience === 'class' ? (waClassId ? `class:${waClassId}` : '') : waAudience
    if (!aud) { setWaPreview([]); return }
    apiClient.waRecipients(aud).then((r) => setWaPreview(r.contacts || [])).catch(() => {})
  }, [waAudience, waClassId, tab])

  // Load WA contacts when wa-contacts audience is selected
  useEffect(() => {
    if (tab !== 'whatsapp' || waAudience !== 'wa-contacts') return
    if (waContacts.length > 0) return  // already loaded
    setWaContactsLoading(true)
    apiClient.waContacts()
      .then((r) => setWaContacts(r.contacts || []))
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load contacts'))
      .finally(() => setWaContactsLoading(false))
  }, [waAudience, tab])

  const handleWaConnect = async () => {
    setWaStatus('connecting')
    try {
      // If already in qr/connecting (e.g. user reopening a closed browser),
      // disconnect first so initialize() isn't skipped by the status guard
      await apiClient.waDisconnect().catch(() => {})
      await apiClient.waConnect()
      if (!waPollerRef.current) {
        waPollerRef.current = setInterval(pollWaStatus, 3000)
      }
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
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    // Read all selected files in parallel, then append to existing list
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              const b64 = reader.result.split(',')[1]
              resolve({ name: file.name, b64, mime: file.type })
            }
            reader.readAsDataURL(file)
          })
      )
    ).then((newFiles) => {
      setWaAttachments((prev) => [...prev, ...newFiles])
    })
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  // ── CSV import handlers ──────────────────────────────────────
  const handleWaCsvFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    import('papaparse').then(({ default: Papa }) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
        complete: (results) => {
          const rows = (results.data || []).map((r: any) => ({
            name:   (r.name || r['contact name'] || r['full name'] || '').toString().trim(),
            number: (r.number || r.phone || r['phone number'] || r.mobile || '').toString().trim(),
          })).filter((r) => r.name || r.number)
          if (rows.length === 0) return toast.error('No valid rows found. Check the CSV has "name" and "number" columns.')
          if (rows.length > 500) return toast.error('Maximum 500 contacts per import. Please split the file.')
          setWaCsvPreview(rows)
          setWaCsvResult(null)
        },
        error: () => toast.error('Failed to parse CSV file.'),
      })
    })
  }

  const handleWaCsvImport = async () => {
    if (waCsvPreview.length === 0) return
    setWaCsvImporting(true)
    setWaCsvResult(null)
    try {
      const res = await apiClient.waBulkImportContacts({ contacts: waCsvPreview })
      setWaCsvResult(res)
      toast.success(res.message || 'Import complete')
      // Merge newly saved contacts into the local list
      if (res.saved?.length > 0) {
        setWaContacts((prev) => {
          const merged = [...prev]
          for (const c of res.saved) {
            if (!merged.some((x) => x.number === c.number)) merged.push(c)
          }
          return merged.sort((a, b) => a.name.localeCompare(b.name))
        })
      }
      setWaCsvPreview([])
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Import failed')
    } finally {
      setWaCsvImporting(false)
    }
  }

  const downloadCsvTemplate = () => {
    const csv = 'name,number\nRavi Kumar,9876543210\nPriya Sharma,9123456789'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'whatsapp_contacts_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleWaAddContact = async () => {
    if (!waNewName.trim()) return toast.error('Please enter a contact name')
    if (!waNewNumber.trim()) return toast.error('Please enter a phone number')
    setWaAddingSaving(true)
    try {
      const res = await apiClient.waAddContact({ name: waNewName.trim(), number: waNewNumber.trim() })
      toast.success(res.message || 'Contact saved!')
      // Add to local list immediately so it shows without a full reload
      const saved = res.contact
      setWaContacts((prev) => {
        const exists = prev.some((c) => c.number === saved.number)
        if (exists) return prev
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      // Auto-select the newly added contact
      setWaSelectedContacts((prev) => {
        const exists = prev.some((c) => c.number === saved.number)
        return exists ? prev : [...prev, saved]
      })
      setWaNewName('')
      setWaNewNumber('')
      setWaShowAddForm(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save contact')
    } finally {
      setWaAddingSaving(false)
    }
  }

  const handleWaSend = async () => {
    if (!waMessage.trim() && waAttachments.length === 0) return toast.error('Please enter a message or attach a file')
    if (waAudience === 'custom' && !waCustomNumbers.trim()) return toast.error('Please enter at least one phone number')
    if (waAudience === 'wa-contacts' && waSelectedContacts.length === 0) return toast.error('Please select at least one contact')
    if (waAudience === 'class' && !waClassId) return toast.error('Please select a class')

    const targetCount = waAudience === 'custom'
      ? waCustomNumbers.split('\n').filter((n) => n.trim()).length
      : waAudience === 'wa-contacts'
      ? waSelectedContacts.length
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
      const audience = waAudience === 'class' ? `class:${waClassId}` : waAudience === 'wa-contacts' ? 'custom' : waAudience
      const customNumbers = waAudience === 'custom'
        ? waCustomNumbers.split('\n').map((n) => n.trim()).filter(Boolean)
        : waAudience === 'wa-contacts'
        ? waSelectedContacts.map((c) => c.number)
        : undefined

      const result = await apiClient.waSend({
        audience,
        customNumbers,
        message: waMessage,
        attachments: waAttachments.map((a) => ({ b64: a.b64, mime: a.mime, name: a.name })),
      })
      toast.success(result.message || 'WhatsApp messages sent!')
      setWaMessage('')
      setWaAttachments([])
      setWaCustomNumbers('')
      setWaSelectedContacts([])
    } catch (err) {
      const msg: string = err?.response?.data?.message || err.message || 'Failed to send WhatsApp messages'
      // If the browser page died, reset to disconnected so the Connect button reappears
      if (msg.toLowerCase().includes('browser was closed') || msg.toLowerCase().includes('crashed') || msg.toLowerCase().includes('reconnect')) {
        setWaStatus('disconnected')
        toast.error('WhatsApp browser was closed. Please click Connect WhatsApp and scan the QR again.')
      } else if (msg.toLowerCase().includes('already sending') || msg.toLowerCase().includes('batch is already')) {
        toast.error('Messages are still being sent in the background. Please wait for the current batch to finish.')
        setWaSending(true) // re-lock the button — batch is still running
        return // skip the finally unlock below
      } else {
        toast.error(msg)
      }
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
      message: `This will send SMS to ${recipientPreview.count} recipient(s). Continue?`,
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
            Send announcements, event info, fee reminders & more to parents via SMS
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
                    {waStatus === 'connecting' && 'Opening browser… please wait 15–30 seconds'}
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
              <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: '#fefce8', border: '2px solid #fbbf24', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>
                    📂 A browser window has opened on this computer!
                  </p>
                  <button
                    onClick={handleWaConnect}
                    title="Accidentally closed the browser? Click to reopen it"
                    style={{ padding: '0.4rem 0.9rem', background: '#92400e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    🔄 Reopen Browser
                  </button>
                </div>
                <p style={{ margin: '0 0 0.5rem', color: '#78350f', fontSize: '0.9rem' }}>
                  <strong>Step 1:</strong> Look at your taskbar / Dock — a Chrome or Chromium window just opened showing WhatsApp Web.
                </p>
                <p style={{ margin: '0 0 0.5rem', color: '#78350f', fontSize: '0.9rem' }}>
                  <strong>Step 2:</strong> On your phone → WhatsApp → ⋮ Settings → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                </p>
                <p style={{ margin: 0, color: '#78350f', fontSize: '0.9rem' }}>
                  <strong>Step 3:</strong> Point your phone camera at the QR code on that browser window. Done! ✅
                </p>
                <p style={{ margin: '0.75rem 0 0', color: '#92400e', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  💡 Accidentally closed the window? Click <strong>Reopen Browser</strong> above to bring it back.
                </p>
              </div>
            )}
            {waStatus === 'connecting' && (
              <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                ⏳ Opening browser window… This may take 15–30 seconds on first run.
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
                  { value: 'class', label: '🏫 By Class' },                  { value: 'wa-contacts', label: '📇 WA Contacts' },                  { value: 'custom', label: '📱 Custom Numbers' },
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

              {waAudience === 'wa-contacts' && (
                <div>
                  {/* Search bar */}
                  <input
                    type="text"
                    style={{ ...inputStyle, marginBottom: '0.6rem' }}
                    placeholder="🔍 Search contacts by name or number..."
                    value={waContactSearch}
                    onChange={(e) => setWaContactSearch(e.target.value)}
                  />

                  {waContactsLoading && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>⏳ Loading contacts...</p>
                  )}

                  {!waContactsLoading && waContacts.length === 0 && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No saved contacts found in WhatsApp.</p>
                  )}

                  {!waContactsLoading && waContacts.length > 0 && (() => {
                    const q = waContactSearch.trim().toLowerCase()
                    const filtered = q
                      ? waContacts.filter((c) => c.name.toLowerCase().includes(q) || c.number.includes(q))
                      : waContacts
                    const isAllSelected = filtered.length > 0 && filtered.every((c) => waSelectedContacts.some((s) => s.number === c.number))
                    return (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                        {/* Select all row */}
                        <div
                          onClick={() => {
                            if (isAllSelected) {
                              setWaSelectedContacts((prev) => prev.filter((s) => !filtered.some((c) => c.number === s.number)))
                            } else {
                              const toAdd = filtered.filter((c) => !waSelectedContacts.some((s) => s.number === c.number))
                              setWaSelectedContacts((prev) => [...prev, ...toAdd])
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', background: 'var(--surface-alt,#f8fafc)', cursor: 'pointer', borderBottom: '1px solid var(--border)', userSelect: 'none' }}
                        >
                          <input type="checkbox" readOnly checked={isAllSelected} style={{ accentColor: '#25d366', width: 15, height: 15 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted)' }}>
                            {isAllSelected ? 'Deselect all' : `Select all (${filtered.length})`}
                          </span>
                        </div>

                        {/* Contact rows */}
                        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                          {filtered.map((c) => {
                            const selected = waSelectedContacts.some((s) => s.number === c.number)
                            return (
                              <div
                                key={c.number}
                                onClick={() => setWaSelectedContacts((prev) =>
                                  selected ? prev.filter((s) => s.number !== c.number) : [...prev, c]
                                )}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                                  padding: '0.55rem 0.9rem',
                                  borderBottom: '1px solid var(--border)',
                                  cursor: 'pointer',
                                  background: selected ? 'rgba(37,211,102,0.06)' : 'transparent',
                                  transition: 'background 0.15s',
                                  userSelect: 'none',
                                }}
                              >
                                <input type="checkbox" readOnly checked={selected} style={{ accentColor: '#25d366', width: 15, height: 15, flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>+{c.number}</span>
                                </div>
                              </div>
                            )
                          })}
                          {filtered.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '1rem', fontSize: '0.85rem' }}>No contacts match your search.</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Selected count + clear */}
                  {waSelectedContacts.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#25d366', fontWeight: 600 }}>✅ {waSelectedContacts.length} contact(s) selected</span>
                      <button
                        onClick={() => setWaSelectedContacts([])}
                        style={{ fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

                  {/* Refresh + Add Contact + Import CSV buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setWaContacts([]); setWaContactsLoading(true); apiClient.waContacts().then((r) => setWaContacts(r.contacts || [])).catch(() => {}).finally(() => setWaContactsLoading(false)) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface-alt,#f8fafc)', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      <RefreshCw size={12} /> Refresh contacts
                    </button>
                    <button
                      onClick={() => { setWaShowAddForm((v) => !v); setWaShowCsvImport(false) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: '1px solid #25d366', borderRadius: '6px', background: waShowAddForm ? '#25d366' : 'rgba(37,211,102,0.07)', color: waShowAddForm ? '#fff' : '#128c7e', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {waShowAddForm ? '✕ Cancel' : '➕ Add New Contact'}
                    </button>
                    <button
                      onClick={() => { setWaShowCsvImport((v) => !v); setWaShowAddForm(false); setWaCsvPreview([]); setWaCsvResult(null) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: '1px solid #6366f1', borderRadius: '6px', background: waShowCsvImport ? '#6366f1' : 'rgba(99,102,241,0.07)', color: waShowCsvImport ? '#fff' : '#4338ca', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {waShowCsvImport ? '✕ Cancel' : '📅 Import CSV'}
                    </button>
                  </div>

                  {/* Inline Add Contact Form */}
                  {waShowAddForm && (
                    <div style={{ marginTop: '0.75rem', padding: '1rem', border: '1.5px solid #25d366', borderRadius: '10px', background: 'rgba(37,211,102,0.04)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#128c7e' }}>➕ Add New WhatsApp Contact</p>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 160px' }}>
                          <label style={{ ...labelStyle, fontSize: '0.78rem', marginBottom: '0.25rem' }}>Name *</label>
                          <input
                            type="text"
                            style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.5rem 0.65rem' }}
                            placeholder="e.g. Ravi Kumar"
                            value={waNewName}
                            onChange={(e) => setWaNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleWaAddContact()}
                          />
                        </div>
                        <div style={{ flex: '1 1 160px' }}>
                          <label style={{ ...labelStyle, fontSize: '0.78rem', marginBottom: '0.25rem' }}>Phone Number *</label>
                          <input
                            type="tel"
                            style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.5rem 0.65rem' }}
                            placeholder="10-digit or with country code"
                            value={waNewNumber}
                            onChange={(e) => setWaNewNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleWaAddContact()}
                          />
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--muted)' }}>10-digit numbers get +91 auto-added. Number must be registered on WhatsApp.</p>
                      <button
                        onClick={handleWaAddContact}
                        disabled={waAddingSaving}
                        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', background: waAddingSaving ? '#94a3b8' : '#25d366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: waAddingSaving ? 'not-allowed' : 'pointer' }}
                      >
                        {waAddingSaving ? '⏳ Saving...' : '💾 Save Contact'}
                      </button>
                    </div>
                  )}

                  {/* ── CSV Import Panel ── */}
                  {waShowCsvImport && (
                    <div style={{ marginTop: '0.75rem', padding: '1rem', border: '1.5px solid #6366f1', borderRadius: '10px', background: 'rgba(99,102,241,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#4338ca' }}>📅 Bulk Import Contacts via CSV</p>
                        <button
                          onClick={downloadCsvTemplate}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', fontSize: '0.78rem', border: '1px solid #6366f1', borderRadius: '6px', background: 'transparent', color: '#4338ca', cursor: 'pointer' }}
                        >
                          ⬇️ Download Template
                        </button>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                        CSV must have two columns: <strong>name</strong> and <strong>number</strong> (header row required).
                        Max 500 contacts per import. 10-digit numbers get +91 added automatically.
                      </p>

                      {/* File picker */}
                      <input ref={waCsvFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleWaCsvFile} />
                      {waCsvPreview.length === 0 && !waCsvResult && (
                        <button
                          onClick={() => waCsvFileRef.current?.click()}
                          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', border: '2px dashed #6366f1', borderRadius: '8px', background: 'transparent', color: '#4338ca', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                        >
                          📂 Choose CSV File
                        </button>
                      )}

                      {/* Preview table */}
                      {waCsvPreview.length > 0 && (
                        <div>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#4338ca' }}>
                            🔍 Preview — {waCsvPreview.length} row(s) found
                          </p>
                          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <thead>
                                <tr style={{ background: '#eef2ff', position: 'sticky', top: 0 }}>
                                  <th style={{ padding: '0.4rem 0.7rem', textAlign: 'left', color: '#4338ca', fontWeight: 700, borderBottom: '1px solid #c7d2fe' }}>#</th>
                                  <th style={{ padding: '0.4rem 0.7rem', textAlign: 'left', color: '#4338ca', fontWeight: 700, borderBottom: '1px solid #c7d2fe' }}>Name</th>
                                  <th style={{ padding: '0.4rem 0.7rem', textAlign: 'left', color: '#4338ca', fontWeight: 700, borderBottom: '1px solid #c7d2fe' }}>Number</th>
                                  <th style={{ padding: '0.4rem 0.7rem', textAlign: 'left', color: '#4338ca', fontWeight: 700, borderBottom: '1px solid #c7d2fe' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {waCsvPreview.map((row, i) => {
                                  const hasName = !!row.name
                                  const hasNum  = !!row.number
                                  const ok = hasName && hasNum
                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid #e0e7ff', background: ok ? 'transparent' : '#fff7ed' }}>
                                      <td style={{ padding: '0.35rem 0.7rem', color: 'var(--muted)' }}>{i + 1}</td>
                                      <td style={{ padding: '0.35rem 0.7rem', fontWeight: 500 }}>{row.name || <span style={{ color: '#ef4444' }}>missing</span>}</td>
                                      <td style={{ padding: '0.35rem 0.7rem', fontFamily: 'monospace' }}>{row.number || <span style={{ color: '#ef4444' }}>missing</span>}</td>
                                      <td style={{ padding: '0.35rem 0.7rem' }}>{ok ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ OK</span> : <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ Incomplete</span>}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={handleWaCsvImport}
                              disabled={waCsvImporting}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', background: waCsvImporting ? '#94a3b8' : '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.88rem', cursor: waCsvImporting ? 'not-allowed' : 'pointer' }}
                            >
                              {waCsvImporting ? '⏳ Importing...' : `💾 Import ${waCsvPreview.length} Contact(s)`}
                            </button>
                            <button
                              onClick={() => { setWaCsvPreview([]); waCsvFileRef.current?.click() }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt,#f8fafc)', color: 'var(--muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              📂 Change File
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Result summary */}
                      {waCsvResult && (
                        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                            ✅ Import complete — {waCsvResult.saved?.length || 0} saved, {waCsvResult.failed?.length || 0} failed
                          </p>
                          {waCsvResult.failed?.length > 0 && (
                            <div style={{ maxHeight: '140px', overflowY: 'auto', marginTop: '0.35rem' }}>
                              {waCsvResult.failed.map((f, i) => (
                                <p key={i} style={{ margin: '0.15rem 0', fontSize: '0.78rem', color: '#991b1b' }}>
                                  ✗ {f.name} ({f.number}) — {f.reason}
                                </p>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => { setWaCsvResult(null); setWaCsvPreview([]) }}
                            style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#4338ca', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Import another file
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recipient preview */}
              {waAudience !== 'custom' && waAudience !== 'wa-contacts' && (
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

              {/* Attachments — multiple files */}
              <div>
                <label style={labelStyle}>Attachments (optional)</label>
                <input ref={waFileRef} type="file" accept="image/*,application/pdf,.doc,.docx" multiple style={{ display: 'none' }} onChange={handleWaFile} />

                {/* Chips for already-attached files */}
                {waAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {waAttachments.map((att, idx) => (
                      <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'rgba(37,211,102,0.08)', border: '1px solid #86efac', borderRadius: '20px', fontSize: '0.82rem', maxWidth: 260 }}>
                        <Paperclip size={13} style={{ color: '#25d366', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={att.name}>{att.name}</span>
                        <button
                          onClick={() => setWaAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, lineHeight: 1, flexShrink: 0 }}
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Always-visible Add button */}
                <button onClick={() => waFileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--surface-alt,#f8fafc)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Paperclip size={14} /> {waAttachments.length > 0 ? 'Add More Files' : 'Attach Image / PDF'}
                </button>
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
