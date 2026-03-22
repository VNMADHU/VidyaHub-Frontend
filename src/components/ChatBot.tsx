// @ts-nocheck
import { useState, useRef, useEffect } from 'react'
import apiClient from '@/services/api'

// ── Message type ─────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string
}

// ── Simple markdown renderer ──────────────────────────────────────────────────
const renderContent = (text: string) => {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold: **text**
    const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Bullet: starts with * or - or •
    if (/^[\*\-•]\s/.test(line)) {
      return (
        <div key={i} className="vb-bullet" dangerouslySetInnerHTML={{ __html: '• ' + boldLine.replace(/^[\*\-•]\s/, '') }} />
      )
    }
    // Numbered: 1. text
    if (/^\d+\.\s/.test(line)) {
      return <div key={i} className="vb-bullet" dangerouslySetInnerHTML={{ __html: boldLine }} />
    }
    if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />
    return <div key={i} dangerouslySetInnerHTML={{ __html: boldLine }} />
  })
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  '📚 Create homework for Class 6',
  '👥 How many students do we have?',
  '✅ Today\'s attendance summary',
  '💼 March 2026 payroll summary',
  '📢 Announce school closed tomorrow',
  '📋 Show pending leave requests',
  '🎉 Schedule Annual Day event',
  '💰 Fee collection status',
]

// ── ChatBot component ─────────────────────────────────────────────────────────
const ChatBot = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hi! I'm **VidyaBot** ✨, your AI assistant for Vidya Hub!\n\nI can help you:\n• 📚 Create homework & exams\n• 👥 Manage students & teachers\n• 📢 Post announcements & events\n• ✅ Check attendance & fees\n• 💼 View payroll & expenses\n\nWhat would you like to do today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg && !attachedImage) return
    if (loading) return

    const finalMsg = msg || '📎 Please analyze this image and take appropriate action.'
    const imageToSend = attachedImage
    setInput('')
    setAttachedImage(null)
    setShowSuggestions(false)

    const userMsg: Message = { role: 'user', content: finalMsg, imagePreview: imageToSend?.preview }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Build history (exclude the initial greeting from history)
      const historyToSend = newMessages.slice(1, -1) // skip first greeting and current msg
      const res = await apiClient.sendChat(finalMsg, historyToSend, imageToSend)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply || 'Sorry, I could not understand that.' }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Oops! Something went wrong: ${err?.message || 'Please try again.'}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          const base64 = dataUrl.split(',')[1]
          setAttachedImage({ data: base64, mimeType: file.type, preview: dataUrl })
        }
        reader.readAsDataURL(file)
        return // stop after first image
      }
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `👋 Chat cleared! I'm **VidyaBot** — ready to help.\n\nWhat can I do for you?`,
    }])
    setShowSuggestions(true)
    setInput('')
    setAttachedImage(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setAttachedImage({ data: base64, mimeType: file.type, preview: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = '' // allow re-selecting the same file
  }

  return (
    <>
      {/* ── Floating toggle button ───────────────────────── */}
      <button
        className="vb-fab"
        onClick={() => setOpen(o => !o)}
        title="VidyaBot AI Assistant"
        aria-label="Open AI Chat"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5"/>
            <path d="M8 10.5h8M8 14h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="19" cy="5" r="3" fill="#fbbf24"/>
            <path d="M19 3.5v1M19 6.5v1M17.5 5h1M20.5 5h1M17.9 3.9l.7.7M20.4 6.4l.7.7M20.4 3.9l-.7.7M17.9 6.4l-.7.7" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        )}
        {!open && messages.length > 1 && (
          <span className="vb-badge">{Math.min(messages.filter(m => m.role === 'assistant').length - 1, 9)}</span>
        )}
      </button>

      {/* ── Chat panel ───────────────────────────────────── */}
      {open && (
        <div className="vb-panel">
          {/* Header */}
          <div className="vb-header">
            <div className="vb-header-left">
              <span className="vb-avatar">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5"/>
                  <path d="M8 10.5h8M8 14h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="19" cy="5" r="3.5" fill="#fbbf24"/>
                  <path d="M19 3.2v1.2M19 6.6v1.2M17 5h1.2M20.8 5H22M17.5 3.5l.85.85M20.65 6.65l.85.85M20.65 3.5l-.85.85M17.5 6.65l-.85.85" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </span>
              <div>
                <div className="vb-title">VidyaBot</div>
                <div className="vb-subtitle">
                  <span className="vb-online-dot" /> AI Assistant · 
                </div>
              </div>
            </div>
            <div className="vb-header-actions">
              <button className="vb-icon-btn" title="Clear chat" onClick={clearChat}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6l-1,14H6L5,6" />
                  <path d="M10,11v6M14,11v6" />
                  <path d="M9,6V4h6v2" />
                </svg>
              </button>
              <button className="vb-icon-btn" title="Close" onClick={() => setOpen(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="vb-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`vb-msg ${msg.role === 'user' ? 'vb-msg-user' : 'vb-msg-bot'}`}>
                {msg.role === 'assistant' && (
                  <div className="vb-msg-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
                      <path d="M8 10.5h8M8 14h5" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="19" cy="5" r="3" fill="#fbbf24"/>
                    </svg>
                  </div>
                )}
                <div className="vb-bubble">
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="attachment" className="vb-attachment-img" />
                  )}
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="vb-msg vb-msg-bot">
                <div className="vb-msg-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
                      <path d="M8 10.5h8M8 14h5" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="19" cy="5" r="3" fill="#fbbf24"/>
                    </svg>
                  </div>
                <div className="vb-bubble vb-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* Suggestion chips — show only at start */}
            {showSuggestions && messages.length === 1 && !loading && (
              <div className="vb-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="vb-chip" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Image attachment preview */}
          {attachedImage && (
            <div className="vb-attachment-preview">
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={attachedImage.preview} alt="attachment preview" />
                <button className="vb-remove-attachment" onClick={() => setAttachedImage(null)} title="Remove image">✕</button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="vb-input-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              className="vb-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              className="vb-input"
              type="text"
              placeholder="Ask me anything… or paste an image"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={loading}
              maxLength={500}
            />
            <button
              className="vb-send-btn"
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !attachedImage) || loading}
              title="Send"
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          <div className="vb-footer">VidyaBot may make mistakes</div>
        </div>
      )}

      {/* ── Styles ───────────────────────────────────────── */}
      <style>{`
        /* FAB button */
        .vb-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99,102,241,0.5);
          z-index: 9990;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .vb-fab:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(99,102,241,0.65); }
        .vb-fab:active { transform: scale(0.97); }
        .vb-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
        }

        /* Panel */
        .vb-panel {
          position: fixed;
          bottom: 100px;
          right: 28px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 560px;
          max-height: calc(100vh - 140px);
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12);
          z-index: 9989;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: vb-slide-up 0.25s ease;
        }
        @keyframes vb-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .vb-header {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #3b82f6 100%);
          color: #fff;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .vb-header-left { display: flex; align-items: center; gap: 10px; }
        .vb-avatar { display: flex; align-items: center; justify-content: center; }
        .vb-title { font-weight: 700; font-size: 15px; }
        .vb-subtitle { font-size: 11px; opacity: 0.85; display: flex; align-items: center; gap: 4px; }
        .vb-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; }
        .vb-header-actions { display: flex; gap: 4px; }
        .vb-icon-btn {
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .vb-icon-btn:hover { background: rgba(255,255,255,0.28); }

        /* Messages */
        .vb-messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f8f9ff;
        }
        .vb-messages::-webkit-scrollbar { width: 4px; }
        .vb-messages::-webkit-scrollbar-thumb { background: #c7c9e0; border-radius: 4px; }

        .vb-msg { display: flex; gap: 8px; align-items: flex-end; }
        .vb-msg-user { flex-direction: row-reverse; }
        .vb-msg-icon { font-size: 20px; flex-shrink: 0; margin-bottom: 2px; }

        .vb-bubble {
          max-width: 82%;
          padding: 10px 13px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
        }
        .vb-msg-bot .vb-bubble {
          background: #fff;
          color: #1e293b;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .vb-msg-user .vb-bubble {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .vb-bullet { padding-left: 4px; margin: 1px 0; }

        /* Typing animation */
        .vb-typing { display: flex; align-items: center; gap: 5px; padding: 13px 18px; }
        .vb-typing span {
          width: 7px; height: 7px; border-radius: 50%;
          background: #6366f1; display: inline-block;
          animation: vb-bounce 1.2s ease-in-out infinite;
        }
        .vb-typing span:nth-child(2) { animation-delay: 0.2s; }
        .vb-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes vb-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }

        /* Suggestion chips */
        .vb-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 4px 0;
        }
        .vb-chip {
          background: #fff;
          border: 1.5px solid #e0e7ff;
          color: #4f46e5;
          border-radius: 20px;
          padding: 5px 11px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .vb-chip:hover { background: #eef2ff; border-color: #6366f1; }

        /* Input row */
        .vb-input-row {
          display: flex;
          gap: 8px;
          padding: 10px 12px;
          background: #fff;
          border-top: 1px solid #e8eaf0;
          flex-shrink: 0;
          align-items: center;
        }
        .vb-input {
          flex: 1;
          border: 1.5px solid #e0e7ff;
          border-radius: 24px;
          padding: 9px 16px;
          font-size: 13.5px;
          outline: none;
          background: #f8f9ff;
          color: #1e293b;
          transition: border-color 0.15s;
        }
        .vb-input:focus { border-color: #6366f1; background: #fff; }
        .vb-input::placeholder { color: #a5a9c0; }
        .vb-input:disabled { opacity: 0.6; }

        .vb-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.15s;
        }
        .vb-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .vb-send-btn:not(:disabled):hover { transform: scale(1.08); }

        /* Footer */
        .vb-footer {
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          padding: 5px 10px 8px;
          background: #fff;
          flex-shrink: 0;
        }

        /* Attachment button */
        .vb-attach-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f0f1ff;
          border: 1.5px solid #e0e7ff;
          color: #6366f1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .vb-attach-btn:hover { background: #e0e7ff; }
        .vb-attach-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Attachment preview (above input row) */
        .vb-attachment-preview {
          position: relative;
          padding: 8px 12px 0;
          background: #fff;
          border-top: 1px solid #e8eaf0;
          display: flex;
          align-items: flex-start;
        }
        .vb-attachment-preview img {
          max-height: 80px;
          max-width: 130px;
          border-radius: 8px;
          border: 1.5px solid #c7d2fe;
          object-fit: cover;
        }
        .vb-remove-attachment {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        /* Image in message bubble */
        .vb-attachment-img {
          max-width: 100%;
          max-height: 180px;
          border-radius: 8px;
          margin-bottom: 6px;
          display: block;
          object-fit: contain;
        }
        .vb-msg-user .vb-attachment-img { border: 1px solid rgba(255,255,255,0.3); }
        .vb-msg-bot .vb-attachment-img { border: 1px solid #e0e7ff; }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .vb-panel { width: calc(100vw - 16px); right: 8px; bottom: 90px; height: calc(100vh - 120px); }
          .vb-fab { bottom: 20px; right: 16px; }
        }
      `}</style>
    </>
  )
}

export default ChatBot
