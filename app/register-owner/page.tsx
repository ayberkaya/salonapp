'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Mail, Lock, User, Building2, AlertCircle, Loader2 } from 'lucide-react'

export default function RegisterOwnerPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const [salonName, setSalonName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!salonName.trim()) {
      setError('Lütfen salon ismini girin.')
      return
    }

    if (!ownerName.trim()) {
      setError('Lütfen adınızı girin.')
      return
    }

    if (!email.trim()) {
      setError('Lütfen e-posta adresinizi girin.')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        setError(authError.message || 'Kullanıcı oluşturulurken hata oluştu.')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Kullanıcı oluşturulamadı.')
        setLoading(false)
        return
      }

      // Step 2: Create salon
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .insert({
          name: salonName.trim(),
        })
        .select()
        .single()

      if (salonError) {
        setError('Salon oluşturulurken hata oluştu: ' + salonError.message)
        setLoading(false)
        return
      }

      // Step 3: Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          salon_id: salonData.id,
          full_name: ownerName.trim(),
          role: 'OWNER',
        })

      if (profileError) {
        // Cleanup: delete salon (auth user will need manual cleanup if needed)
        try {
          await supabase.from('salons').delete().eq('id', salonData.id)
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        setError('Profil oluşturulurken hata oluştu: ' + profileError.message)
        setLoading(false)
        return
      }

      // Success
      showToast('Salon sahibi hesabı başarıyla oluşturuldu!', 'success')
      router.push('/login')
    } catch (err: any) {
      setError(`Beklenmeyen hata: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Salon Sahibi Kaydı</h1>
          <p className="mt-2 text-gray-600">Yeni salon hesabı oluşturun</p>
        </div>

        {/* Register Card */}
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Salon Name */}
              <div>
                <label htmlFor="salonName" className="mb-2 block text-sm font-medium text-gray-700">
                  Salon İsmi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="salonName"
                    name="salonName"
                    type="text"
                    required
                    className="pl-11"
                    placeholder="Örn: Kuaför Sadakat"
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label htmlFor="ownerName" className="mb-2 block text-sm font-medium text-gray-700">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    className="pl-11"
                    placeholder="Adınız Soyadınız"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  E-posta Adresi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="pl-11"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                  Şifre <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="pl-11"
                    placeholder="En az 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-700">
                  Şifre Tekrar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="pl-11"
                    placeholder="Şifrenizi tekrar girin"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Hesap oluşturuluyor...
                </>
              ) : (
                'Hesap Oluştur'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Zaten hesabınız var mı?{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Giriş yapın
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

