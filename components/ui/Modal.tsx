'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  title?: string
}

export default function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  title,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking on a dropdown or its trigger
      if (target.closest('[data-customer-dropdown]') || target.closest('[data-service-dropdown]')) {
        return
      }
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-5xl',
    full: 'max-w-[95vw]',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className={cn(
          'w-full rounded-lg bg-white shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0 rounded-t-lg">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-full p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className={cn(
          'overflow-y-auto flex-1',
          title ? 'p-4 sm:p-6' : 'p-4 sm:p-6'
        )} style={{ maxHeight: title ? 'calc(95vh - 100px)' : 'calc(95vh - 32px)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

