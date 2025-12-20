'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Home } from 'lucide-react'

function CheckInContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const servicesParam = searchParams.get('services')
  const [step, setStep] = useState<'confirming' | 'success' | 'error'>('confirming')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Missing visit token')
      setStep('error')
      return
    }

    // Automatically confirm visit when token is present
    const confirmVisit = async () => {
      try {
        // Parse services if present
        let services = null
        if (servicesParam) {
          try {
            services = JSON.parse(decodeURIComponent(servicesParam))
          } catch {
            services = servicesParam
          }
        }

        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, services }),
        })

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error('Failed to parse response:', jsonError)
          setError('Sunucu yanıtı işlenemedi. Lütfen tekrar deneyin.')
          setStep('error')
          return
        }

        if (!response.ok) {
          console.error('Checkin API error:', {
            status: response.status,
            statusText: response.statusText,
            error: data?.error,
            data
          })
          setError(data?.error || 'Failed to confirm visit')
          setStep('error')
          return
        }

        setStep('success')
      } catch (err) {
        console.error('Checkin request error:', err)
        setError('Network error. Please try again.')
        setStep('error')
      }
    }

    confirmVisit()
  }, [token])

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
        <Link
          href="/home"
          className="fixed left-4 top-4 z-50 rounded-lg p-2 text-gray-600 transition-colors hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Ana Sayfa"
        >
          <Home className="h-6 w-6" />
        </Link>
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-12 w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Ziyaretiniz Onaylandı!</h1>
          <p className="text-lg text-gray-600">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    const errorMessages: Record<string, string> = {
      'Token has expired': 'QR kodun süresi dolmuş. Lütfen yeni bir QR kod oluşturun.',
      'Token has already been used': 'Bu QR kod zaten kullanılmış.',
      'Invalid or expired token': 'Geçersiz veya süresi dolmuş QR kod.',
      'Invalid token': 'Geçersiz QR kod. Lütfen yeni bir QR kod oluşturun.',
      'You have already checked in today': 'Bugün zaten ziyaret kaydınız var.',
      'Missing visit token': 'QR kod bulunamadı.',
      'Failed to record visit': 'Ziyaret kaydedilemedi. Lütfen tekrar deneyin.',
      'Internal server error': 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      'Network error. Please try again.': 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.',
    }

    const errorTitle = errorMessages[error || ''] || (error || 'Bir hata oluştu')

    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
        <Link
          href="/home"
          className="fixed left-4 top-4 z-50 rounded-lg p-2 text-gray-600 transition-colors hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Ana Sayfa"
        >
          <Home className="h-6 w-6" />
        </Link>
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-12 w-12 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Hata</h1>
          <p className="mb-6 text-gray-600">{errorTitle}</p>
        </div>
      </div>
    )
  }

  // Confirming state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Link
        href="/home"
        className="fixed left-4 top-4 z-50 rounded-lg p-2 text-gray-600 transition-colors hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Ana Sayfa"
      >
        <Home className="h-6 w-6" />
      </Link>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Ziyaret onaylanıyor...</h1>
        <p className="text-sm text-gray-600">Lütfen bekleyin</p>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  )
}
