'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { smsProvider } from '@/lib/sms'

function CheckInContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp' | 'confirming' | 'success' | 'error'>(() => {
    return token ? 'phone' : 'error'
  })
  const [error, setError] = useState<string | null>(() => {
    return token ? null : 'Missing visit token'
  })
  const [otpCode, setOtpCode] = useState<string | null>(null)
  const supabase = createClient()

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setOtpCode(code)

    // Send OTP via SMS (mock in MVP)
    await smsProvider.sendOTP(phone, code)

    setStep('otp')
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (otp !== otpCode) {
      setError('Invalid OTP code')
      return
    }

    // Sign in or sign up the user with phone
    // In Supabase, we'll use a magic link approach or phone auth
    // For MVP, we'll create a session using the phone number
    // Note: Supabase doesn't have built-in phone OTP, so we'll use a custom approach
    
    if (!token) {
      setError('Missing visit token')
      return
    }

    // Verify token and get customer
    const { data: tokenData, error: tokenError } = await supabase
      .from('visit_tokens')
      .select('*, customers(*)')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      setError('Invalid or expired token')
      return
    }

    const customer = tokenData.customers as { id: string; phone: string; full_name: string }
    if (customer.phone !== phone) {
      setError('Phone number does not match customer')
      return
    }

    // Create a temporary session or proceed with confirmation
    await handleConfirmVisit()
  }

  const handleConfirmVisit = async () => {
    if (!token) {
      setError('Missing visit token')
      setStep('error')
      return
    }

    setStep('confirming')
    setError(null)

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to confirm visit')
        setStep('error')
        return
      }

      setStep('success')
    } catch (err) {
      setError('Network error. Please try again.')
      setStep('error')
    }
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Ziyaret Onaylandı!</h1>
          <p className="text-lg text-gray-600">Teşekkür ederiz.</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    const errorMessages: Record<string, string> = {
      'Token has expired': 'QR kodun süresi dolmuş. Lütfen yeni bir QR kod oluşturun.',
      'Token has already been used': 'Bu QR kod zaten kullanılmış.',
      'Invalid or expired token': 'Geçersiz veya süresi dolmuş QR kod.',
      'You have already checked in today': 'Bugün zaten ziyaret kaydınız var.',
      'Phone number does not match': 'Telefon numarası eşleşmiyor.',
      'Missing visit token': 'QR kod bulunamadı.',
    }

    const errorTitle = errorMessages[error || ''] || 'Bir hata oluştu'
    const canRetry = !error?.includes('expired') && !error?.includes('already been used')

    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
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
          {canRetry && (
            <button
              onClick={() => {
                setStep('phone')
                setError(null)
                setPhone('')
                setOtp('')
              }}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
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

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">OTP Kodu</h1>
            <p className="text-gray-600">
              {phone} numarasına gönderilen kodu girin
            </p>
          </div>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleOTPSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium text-gray-700">
                6 Haneli Kod
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Onayla
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setError(null)
              }}
              className="w-full text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Telefon numarasını değiştir
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Ziyaret Onayı</h1>
          <p className="text-gray-600">
            Telefon numaranızı girerek ziyareti onaylayın
          </p>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
        <form onSubmit={handlePhoneSubmit} className="space-y-6">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
              Telefon Numarası
            </label>
            <input
              id="phone"
              type="tel"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-4 text-lg text-black transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+90 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            OTP Gönder
          </button>
        </form>
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

