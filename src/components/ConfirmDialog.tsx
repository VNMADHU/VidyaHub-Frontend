import { useState, createContext, useContext, type ReactNode } from 'react'
import type { ConfirmOptions } from '@/types'

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmContextValue | null>(null)

export const useConfirm = (): ConfirmContextValue => {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return context
}

interface DialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })

  const confirm = ({
    title = 'Confirm Delete',
    message,
    onConfirm: onConfirmCallback,
    confirmText = 'Delete',
    cancelText = 'Cancel',
  }: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          resolve(true)
          onConfirmCallback?.()
          closeDialog()
        },
        onCancel: () => {
          resolve(false)
          closeDialog()
        },
      })
    })
  }

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialogState.isOpen && (
        <div className="modal-overlay" onClick={dialogState.onCancel ?? undefined}>
          <div
            className="modal-content confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{dialogState.title}</h3>
              <button
                className="modal-close"
                onClick={dialogState.onCancel ?? undefined}
              >
                ✕
              </button>
            </div>
            <div className="confirm-dialog-body">
              <p>{dialogState.message}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button
                className="btn outline"
                onClick={dialogState.onCancel ?? undefined}
              >
                {dialogState.cancelText}
              </button>
              <button
                className="btn danger"
                onClick={dialogState.onConfirm ?? undefined}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}
