import React, { createContext, useContext, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

interface ToastContextType {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  removeToast: (id: string) => void
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration = 4000
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastItem = { id, type, title, message, duration }

    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title)
  }, [showToast])

  const error = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title, 5000)
  }, [showToast])

  const warning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title)
  }, [showToast])

  const info = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title)
  }, [showToast])

  const confirmDialog = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve: (val: boolean) => {
          setConfirmState(null)
          resolve(val)
        }
      })
    })
  }, [])

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-[#9E7111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getToastBorder = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-l-success border-[#E8E2D6]'
      case 'error': return 'border-l-error border-[#E8E2D6]'
      case 'warning': return 'border-l-[#9E7111] border-[#E8E2D6]'
      case 'info': return 'border-l-info border-[#E8E2D6]'
    }
  }

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        removeToast,
        confirmDialog
      }}
    >
      {children}

      {/* Toast Notification Container (Top-Right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white border border-l-4 shadow-lg shadow-brand-200/50 transition-all duration-300 animate-fade-in-right
              ${getToastBorder(toast.type)}
            `}
          >
            <div className="shrink-0 mt-0.5">
              {getToastIcon(toast.type)}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold text-neutral-900 leading-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-2xl p-6 sm:p-7 max-w-md w-full animate-scale-up space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${confirmState.options.isDestructive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-[#FAF8F5] text-[#9E7111] border border-[#E8E2D6]'}`}>
                {confirmState.options.isDestructive ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="font-extrabold text-base text-neutral-900 leading-tight">
                {confirmState.options.title || 'Confirmación requerida'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
              {confirmState.options.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D6]">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#FAF8F5] text-neutral-700 font-bold text-xs transition-all cursor-pointer"
              >
                {confirmState.options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className={`
                  px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer
                  ${confirmState.options.isDestructive 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-[#9E7111] hover:bg-[#7a5807] shadow-gold-500/20'}
                `}
              >
                {confirmState.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const useNotify = useToast
