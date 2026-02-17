import { useState, createContext, useContext } from 'react'

const ConfirmDialogContext = createContext()

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return context
}

export const ConfirmDialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })

  const confirm = ({ title = 'Confirm Delete', message, onConfirm, confirmText = 'Delete', cancelText = 'Cancel' }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          resolve(true)
          onConfirm?.()
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
        <div className="modal-overlay" onClick={dialogState.onCancel}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{dialogState.title}</h3>
              <button className="modal-close" onClick={dialogState.onCancel}>✕</button>
            </div>
            <div className="confirm-dialog-body">
              <p>{dialogState.message}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button className="btn outline" onClick={dialogState.onCancel}>
                {dialogState.cancelText}
              </button>
              <button className="btn danger" onClick={dialogState.onConfirm}>
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}
