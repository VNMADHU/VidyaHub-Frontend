import { useState, useCallback, useEffect } from 'react'
import { create } from 'zustand'
import type { Toast, ToastType } from '@/types'

/**
 * Toast notification store — manages toast state globally.
 * (Kept as zustand since it's UI-only ephemeral state, not app state)
 */
interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Partial<Toast> & { type: ToastType; message: string }) => void
  removeToast: (id: number) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: Date.now() + Math.random(),
          duration: 4000,
          ...toast,
        } as Toast,
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
 */
export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast)

  return {
    success: (message: string) => addToast({ type: 'success', message }),
    error: (message: string) => addToast({ type: 'error', message }),
    info: (message: string) => addToast({ type: 'info', message }),
    warning: (message: string) => addToast({ type: 'warning', message }),
  }
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
  warning: '⚠',
}

/**
 * Single toast item with auto-dismiss and exit animation.
 */
const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) => {
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
