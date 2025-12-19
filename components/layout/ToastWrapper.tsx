'use client'

import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/lib/toast-context'

export default function ToastWrapper() {
  const { toasts, removeToast } = useToast()
  return <ToastContainer toasts={toasts} removeToast={removeToast} />
}

