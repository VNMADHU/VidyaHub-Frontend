import { useState, useCallback, useEffect } from 'react'
import { create } from 'zustand'

/**
 * Toast notification store — manages toast state globally.
 */
const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: Date.now() + Math.random(),
          duration: 4000,
          ...toast,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

/**
 * Hook for showing toasts from any component.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Student added!')
 *   toast.error('Failed to save')
 *   toast.info('Loading data...')
 *   toast.warning('Unsaved changes')
 */
export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast)

  return {
    success: (message) => addToast({ type: 'success', message }),
    error: (message) => addToast({ type: 'error', message }),
    info: (message) => addToast({ type: 'info', message }),
    warning: (message) => addToast({ type: 'warning', message }),
  }
}

const TOAST_ICONS = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
  warning: '⚠',
}

/**
 * Single toast item with auto-dismiss and exit animation.
 */
const ToastItem = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration)
    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const handleDismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }, [toast.id, onRemove])

  return (
    <div
      className={`toast toast-${toast.type} ${exiting ? 'toast-exit' : ''}`}
      role="alert"
      onClick={handleDismiss}
    >
      <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        type="button"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

/**
 * Toast container — renders at the top-right of the viewport.
 * Place this once in your app (e.g., in App.jsx or main layout).
 */
const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

export default ToastContainer
