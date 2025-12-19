'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { smsProvider } from '@/lib/sms'

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp' | 'confirming' | 'success' | 'error'>('phone')
  const [error, setError] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setError('Missing visit token')
      setStep('error')
    }
  }, [token])

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

    const customer = tokenData.customers as any
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
      return
    }

    setStep('confirming')
    setError(null)

    // Verify token is valid and not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from('visit_tokens')
      .select('*, customers(*)')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      setError('Invalid or expired token')
      setStep('error')
      return
    }

    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      setError('Token has expired')
      setStep('error')
      return
    }

    if (tokenData.used_at) {
      setError('Token has already been used')
      setStep('error')
      return
    }

    const customer = tokenData.customers as any

    // Check if phone matches (if we have phone from OTP)
    if (phone && customer.phone !== phone) {
      setError('Phone number does not match')
      setStep('error')
      return
    }

    // Optional: Check max 1 visit per day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayVisits } = await supabase
      .from('visits')
      .select('id')
      .eq('customer_id', customer.id)
      .gte('visited_at', today.toISOString())

    if (todayVisits && todayVisits.length > 0) {
      setError('You have already checked in today')
      setStep('error')
      return
    }

    // Create visit record
    const { error: visitError } = await supabase
      .from('visits')
      .insert({
        salon_id: tokenData.salon_id,
        customer_id: tokenData.customer_id,
        created_by: tokenData.created_by,
        visited_at: new Date().toISOString(),
      })

    if (visitError) {
      setError('Failed to record visit')
      setStep('error')
      return
    }

    // Mark token as used
    await supabase
      .from('visit_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    // Update customer last_visit_at
    await supabase
      .from('customers')
      .update({ last_visit_at: new Date().toISOString() })
      .eq('id', customer.id)

    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Visit Recorded!</h1>
          <p className="text-gray-600">Thank you for your visit.</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">❌</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Error</h1>
          <p className="mb-4 text-gray-600">{error || 'Something went wrong'}</p>
          <button
            onClick={() => {
              setStep('phone')
              setError(null)
              setPhone('')
              setOtp('')
            }}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">⏳</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Confirming visit...</h1>
        </div>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Enter OTP</h1>
          <p className="mb-4 text-sm text-gray-600">
            We sent a code to {phone}
          </p>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setError(null)
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Change phone number
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Confirm Your Visit</h1>
        <p className="mb-4 text-sm text-gray-600">
          Enter your phone number to confirm your visit
        </p>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <input
              type="tel"
              required
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+90 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700"
          >
            Send OTP
          </button>
        </form>
      </div>
    </div>
  )
}

