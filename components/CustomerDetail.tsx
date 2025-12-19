'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import { ArrowLeft, Calendar, Users, Clock, QrCode, Edit2, Save, X, Scissors } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'
import { getAppUrl } from '@/lib/utils'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']
type Visit = Database['public']['Tables']['visits']['Row'] & {
  profiles?: { full_name: string }
}

interface CustomerDetailProps {
  customer: Customer
  visits: Visit[]
  visitCount: number
  profile: Profile
}

export default function CustomerDetail({
  customer,
  visits,
  visitCount,
  profile,
}: CustomerDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>(customer)
  const [isSaving, setIsSaving] = useState(false)

  // İl değiştiğinde ilçe listesini sıfırla
  const handleProvinceChange = (selectedProvince: string) => {
    setEditedCustomer({
      ...editedCustomer,
      province: selectedProvince,
      district: '', // İl değişince ilçeyi sıfırla
    })
  }

  // Seçilen ile göre ilçe listesi
  const districts = editedCustomer.province ? (turkeyCities[editedCustomer.province] || []) : []

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Her kelimenin ilk harfini büyük yap
      const capitalizeWords = (str: string) => {
        if (!str) return str
        return str
          .toLowerCase()
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
      
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: capitalizeWords(editedCustomer.full_name || ''),
          phone: editedCustomer.phone,
          province: editedCustomer.province || null,
          district: editedCustomer.district || null,
          birth_day: editedCustomer.birth_day || null,
          birth_month: editedCustomer.birth_month || null,
          hair_color: editedCustomer.hair_color || null,
        })
        .eq('id', customer.id)

      if (error) {
        showToast('Müşteri bilgileri güncellenirken hata oluştu', 'error')
        console.error('Update error:', error)
      } else {
        showToast('Müşteri bilgileri başarıyla güncellendi', 'success')
        setIsEditing(false)
        // Refresh the page to show updated data
        router.refresh()
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedCustomer(customer)
    setIsEditing(false)
  }

  const handleStartVisit = async () => {
    const tokenValue = crypto.randomUUID()
    const expiresAtDate = new Date(Date.now() + 60 * 1000) // 60 seconds

    const { data, error } = await supabase
      .from('visit_tokens')
      .insert({
        salon_id: profile.salon_id,
        customer_id: customer.id,
        created_by: profile.id,
        token: tokenValue,
        expires_at: expiresAtDate.toISOString(),
      })
      .select()
      .single()

    if (!error && data) {
      setQrToken(tokenValue)
      setExpiresAt(expiresAtDate)
      const checkinUrl = `${getAppUrl()}/checkin?token=${tokenValue}`
      setQrUrl(checkinUrl)
      setShowQRModal(true)
    } else {
      showToast('Ziyaret başlatılamadı', 'error')
    }
  }

  const lastVisitDate = customer.last_visit_at
    ? new Date(customer.last_visit_at).toLocaleDateString('tr-TR')
    : 'Henüz ziyaret yok'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="cursor-pointer mt-1 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Geri"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad
                </label>
                <Input
                  type="text"
                  value={editedCustomer.full_name || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    // Her kelimenin ilk harfini büyük yap
                    const capitalized = value
                      .toLowerCase()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                    setEditedCustomer({ ...editedCustomer, full_name: capitalized })
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-500">
                    +90
                  </span>
                  <Input
                    type="tel"
                    value={editedCustomer.phone?.replace('+90', '') || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setEditedCustomer({ ...editedCustomer, phone: value ? `+90${value}` : '' })
                    }}
                    placeholder="5551234567"
                    className="pl-12"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İl
                </label>
                <select
                  value={editedCustomer.province || ''}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-blue-500 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İlçe
                </label>
                <select
                  value={editedCustomer.district || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, district: e.target.value })}
                  disabled={!editedCustomer.province}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doğum Günü
                </label>
                <div className="flex gap-2">
                  <select
                    value={editedCustomer.birth_day || ''}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, birth_day: e.target.value ? Number(e.target.value) : null })}
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
                    value={editedCustomer.birth_month || ''}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, birth_month: e.target.value ? Number(e.target.value) : null })}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boya Rengi
                </label>
                <Input
                  type="text"
                  value={editedCustomer.hair_color || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, hair_color: e.target.value })}
                  placeholder="Örn: 6.3 açık karamel"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !editedCustomer.full_name || !editedCustomer.phone}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{customer.full_name}</h1>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Düzenle
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <p className="text-lg text-gray-600">{customer.phone}</p>
                {customer.province && customer.district && (
                  <p className="text-sm text-gray-500">
                    {customer.province}, {customer.district}
                  </p>
                )}
                {customer.birth_day && customer.birth_month && (
                  <p className="text-sm text-gray-500">
                    Doğum Günü: {customer.birth_day} {[
                      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
                    ][customer.birth_month - 1]}
                  </p>
                )}
                {customer.hair_color && (
                  <p className="text-sm text-gray-500">
                    Boya Rengi: <span className="font-medium">{customer.hair_color}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Ziyaret</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{visitCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Son Ziyaret</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{lastVisitDate}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Durum</p>
              <div className="mt-2">
                {customer.last_visit_at ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="warning">Yeni</Badge>
                )}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Primary CTA */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        {/* Ziyaret Devamlılığı İkonları */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }, (_, index) => {
              const filledCount = visitCount % 5 === 0 && visitCount > 0 ? 5 : visitCount % 5
              const isFilled = index < filledCount
              return (
                <div
                  key={index}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isFilled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                  title={`Ziyaret ${index + 1}`}
                >
                  <Scissors className="h-5 w-5" />
                </div>
              )
            })}
          </div>
          {visitCount > 0 && visitCount % 5 === 0 && (
            <Badge variant="success" className="ml-2">
              İndirim Hakkı!
            </Badge>
          )}
        </div>
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <QrCode className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">Yeni Ziyaret Başlat</h3>
          <p className="mb-6 text-sm text-gray-600">
            QR kod oluşturarak müşterinin ziyaretini onaylamasını sağlayın
          </p>
          <Button
            onClick={handleStartVisit}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            <QrCode className="mr-2 h-5 w-5" />
            Ziyaret Başlat
          </Button>
        </div>
      </Card>

      {/* Visit History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Ziyaret Geçmişi</h2>
          {visits.length > 0 && (
            <Badge variant="default">{visits.length} ziyaret</Badge>
          )}
        </div>
        {visits.length > 0 ? (
          <div className="space-y-3">
            {visits.map((visit) => {
              const visitDate = new Date(visit.visited_at)
              const isToday = visitDate.toDateString() === new Date().toDateString()
              
              return (
                <Card key={visit.id} className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {visitDate.toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {isToday && (
                          <Badge variant="success" className="text-xs">Bugün</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {visitDate.toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {visit.profiles && (
                        <p className="mt-2 text-xs text-gray-500">
                          Kaydeden: {visit.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-12">
            <EmptyState
              title="Henüz ziyaret yok"
              description="İlk ziyareti başlatmak için 'Ziyaret Başlat' butonuna tıklayın"
            />
          </Card>
        )}
      </div>

      {/* QR Modal */}
      {showQRModal && qrUrl && (
        <QRModal
          customerName={customer.full_name}
          qrUrl={qrUrl}
          expiresAt={expiresAt}
          onClose={() => {
            setShowQRModal(false)
            setQrToken(null)
            setQrUrl(null)
            setExpiresAt(null)
          }}
          onRegenerate={handleStartVisit}
        />
      )}
    </div>
  )
}

function QRModal({
  customerName,
  qrUrl,
  expiresAt,
  onClose,
  onRegenerate,
}: {
  customerName: string
  qrUrl: string
  expiresAt: Date | null
  onClose: () => void
  onRegenerate: () => void
}) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [status, setStatus] = useState<'waiting' | 'expired'>('waiting')

  useEffect(() => {
    if (!expiresAt) return

    // Initialize time remaining
    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining === 0) {
        setStatus('expired')
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const formatTime = (seconds: number) => {
    return `${seconds}s`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4">
      <div className="flex w-full max-w-4xl flex-col items-center space-y-8 text-center">
        {/* Header */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {customerName}
          </h2>
          <p className="mt-2 text-lg text-gray-300">
            QR kodu tarayarak ziyareti onaylayın
          </p>
        </div>

        {/* QR Code */}
        <div className="rounded-2xl border-4 border-white bg-white p-6 shadow-2xl">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrUrl)}&margin=1`}
            alt="QR Code"
            className="h-auto w-full max-w-md"
          />
        </div>

        {/* Countdown */}
        <div className="space-y-4">
          {status === 'waiting' ? (
            <>
              <div className="text-center">
                <p className="text-5xl font-bold text-white sm:text-6xl">
                  {formatTime(timeRemaining)}
                </p>
                <p className="mt-2 text-lg text-gray-300">Kalan süre</p>
              </div>
              <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-700 sm:w-96">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{
                    width: `${(timeRemaining / 60) * 100}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-semibold text-yellow-400">
                Süre doldu
              </p>
              <p className="mt-2 text-gray-300">
                Yeni bir QR kod oluşturun
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          {status === 'expired' && (
            <Button
              onClick={onRegenerate}
              size="lg"
              className="flex-1"
            >
              Yeni QR Kod Oluştur
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            size="lg"
            className="flex-1 bg-gray-700 text-white hover:bg-gray-600"
          >
            Kapat
          </Button>
        </div>
      </div>
    </div>
  )
}


