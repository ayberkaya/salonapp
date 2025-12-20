'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const salonId = searchParams.get('salon_id')
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [birthDay, setBirthDay] = useState<number | ''>('')
  const [birthMonth, setBirthMonth] = useState<number | ''>('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [salonValid, setSalonValid] = useState<boolean | null>(null)

  const supabase = createClient()

  // Validate salon_id on mount
  useEffect(() => {
    const validateSalon = async () => {
      if (!salonId) {
        setSalonValid(false)
        return
      }

      // Check if salon exists
      const { data, error } = await supabase
        .from('salons')
        .select('id')
        .eq('id', salonId)
        .single()

      if (error || !data) {
        setSalonValid(false)
      } else {
        setSalonValid(true)
      }
    }

    validateSalon()
  }, [salonId, supabase])

  // İl değiştiğinde ilçe listesini sıfırla
  const handleProvinceChange = (selectedProvince: string) => {
    setProvince(selectedProvince)
    setDistrict('')
  }

  // Seçilen ile göre ilçe listesi
  const districts = province ? (turkeyCities[province] || []) : []

  const capitalizeWords = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!salonId) {
      showToast('Salon bilgisi bulunamadı. Lütfen QR kodu tekrar okutun.', 'error')
      return
    }

    if (!name || !phone || phone.length !== 10 || !consent) {
      showToast('Lütfen tüm zorunlu alanları doldurun.', 'error')
      return
    }

    setLoading(true)

    try {
      // Telefon numarasını +90 ile birleştir
      const fullPhone = `+90${phone}`

      const { data, error } = await supabase
        .from('customers')
        .insert({
          salon_id: salonId,
          full_name: capitalizeWords(name),
          phone: fullPhone,
          province: province || null,
          district: district || null,
          birth_day: birthDay ? Number(birthDay) : null,
          birth_month: birthMonth ? Number(birthMonth) : null,
          kvkk_consent_at: new Date().toISOString(),
          has_welcome_discount: true, // Hoş geldin indirimi ver
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          showToast('Bu telefon numarası zaten kayıtlı.', 'error')
        } else {
          showToast('Kayıt sırasında bir hata oluştu.', 'error')
          console.error('Registration error:', error)
        }
        setLoading(false)
        return
      }

      if (data) {
        setSuccess(true)
        showToast('Kayıt başarıyla tamamlandı! %15 hoş geldin indirimi kazandınız.', 'success')
        
        // 3 saniye sonra ana sayfaya yönlendir
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err) {
      console.error('Registration error:', err)
      showToast('Beklenmeyen bir hata oluştu.', 'error')
      setLoading(false)
    }
  }

  if (!salonId || salonValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Geçersiz QR Kod</h1>
          <p className="text-gray-600">
            {salonValid === false 
              ? 'Bu QR kod geçersiz veya salon bulunamadı. Lütfen geçerli bir QR kod okutun.'
              : 'Lütfen geçerli bir QR kod okutun.'}
          </p>
        </Card>
      </div>
    )
  }

  if (salonValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-600">Yükleniyor...</p>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Kayıt Başarılı!</h1>
          <p className="mb-4 text-lg text-gray-600">
            Hoş geldiniz! %15 hoş geldin indirimi kazandınız.
          </p>
          <p className="text-sm text-gray-500">
            Ana sayfaya yönlendiriliyorsunuz...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Hoşgeldiniz!</h1>
            <p className="mt-2 text-gray-600">
              Bilgilerinizi doldurarak kayıt olun ve %15 hoş geldin indirimi kazanın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  const value = e.target.value
                  const capitalized = value
                    .toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                  setName(capitalized)
                }}
                placeholder="Adınız Soyadınız"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                Telefon <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  +90
                </span>
                <Input
                  id="phone"
                  type="tel"
                  required
                  className="pl-12"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(value)
                  }}
                  placeholder="5551234567"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">10 haneli telefon numaranızı girin</p>
            </div>

            <div>
              <label htmlFor="province" className="mb-2 block text-sm font-medium text-gray-700">
                İl
              </label>
              <select
                id="province"
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">İl Seçiniz</option>
                {turkeyProvinces.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="district" className="mb-2 block text-sm font-medium text-gray-700">
                İlçe
              </label>
              <select
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!province}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">İlçe Seçiniz</option>
                {districts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Doğum Günü
              </label>
              <div className="flex gap-2">
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Gün</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Ay</option>
                  {[
                    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
                  ].map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                required
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="consent" className="ml-2 text-sm text-gray-700">
                KVKK Aydınlatma Metni'ni okudum ve kabul ediyorum. <span className="text-red-500">*</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol ve %15 İndirim Kazan'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

