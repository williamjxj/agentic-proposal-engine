/**
 * Toast Context - Global success/error feedback
 * Provides toast.success() and toast.error() for consistent feedback across pages
 */

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SuccessToast } from '@/components/workflow/undo-toast'
import { ErrorToast } from '@/components/workflow/error-toast'
import { errorFormatter, type FormattedError } from '@/lib/errors/error-formatter'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: string
  type: ToastType
  component: ReactNode
}

interface ToastContextValue {
  success: (message: string) => void
  error: (messageOrError: string | unknown) => void
  errorFormatted: (error: FormattedError) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const noop = () => {}

const fallback: ToastContextValue = {
  success: noop,
  error: noop,
  errorFormatted: noop,
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  return ctx ?? fallback
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((message: string) => {
    const id = `success-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [
      ...prev,
      {
        id,
        type: 'success',
        component: (
          <SuccessToast message={message} onClose={() => removeToast(id)} />
        ),
      },
    ])
  }, [removeToast])

  const error = useCallback((messageOrError: string | unknown) => {
    const formatted =
      typeof messageOrError === 'string'
        ? {
            title: 'Something went wrong',
            whatWentWrong: messageOrError,
            whyItMatters: 'Your request could not be completed.',
            howToFix: 'Please try again or contact support.',
            severity: 'error' as const,
          }
        : errorFormatter.format(messageOrError)
    errorFormatted(formatted)
  }, [])

  const errorFormatted = useCallback(
    (err: FormattedError) => {
      const id = `error-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: 'error',
          component: (
            <ErrorToast error={err} onClose={() => removeToast(id)} />
          ),
        },
      ])
    },
    [removeToast]
  )

  const value = useMemo(
    () => ({ success, error, errorFormatted }),
    [success, error, errorFormatted]
  )

  const successToasts = toasts.filter((t) => t.type === 'success')
  const errorToasts = toasts.filter((t) => t.type === 'error')

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(({ id, component }) => (
          <div key={id} className="pointer-events-auto">
            {component}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
