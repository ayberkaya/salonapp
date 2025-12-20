'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import { ArrowLeft, Calendar, Users, Clock, QrCode, Edit2, Save, X, Scissors, Gift, CheckCircle, Copy, Star, FileText, Receipt } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'
import { getAppUrl } from '@/lib/utils'
import { getLoyaltyLevel, LOYALTY_LEVELS, getNextLevel, getLoyaltyLevelInfo } from '@/lib/loyalty'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']
type Visit = Database['public']['Tables']['visits']['Row'] & {
  profiles?: { full_name: string }
}

type Invoice = {
  id: string
  invoice_number: string
  subtotal: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  created_at: string
  invoice_items: Array<{
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
  invoice_staff: Array<{
    staff: {
      full_name: string
    }
  }>
}

interface CustomerDetailProps {
  customer: Customer
  visits: Visit[]
  visitCount: number
  profile: Profile
  invoices?: Invoice[]
}

export default function CustomerDetail({
  customer,
  visits,
  visitCount,
  profile,
  invoices = [],
}: CustomerDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [showQRModal, setShowQRModal] = useState(false)
  const [showServiceSelectModal, setShowServiceSelectModal] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>(customer)
  const [isSaving, setIsSaving] = useState(false)
  const [salonDiscounts, setSalonDiscounts] = useState<{
    loyalty_bronze_discount?: number | null
    loyalty_silver_discount?: number | null
    loyalty_gold_discount?: number | null
    loyalty_platinum_discount?: number | null
    loyalty_vip_discount?: number | null
  } | null>(null)
  const [salonThresholds, setSalonThresholds] = useState<{
    loyalty_silver_min_visits?: number | null
    loyalty_gold_min_visits?: number | null
    loyalty_platinum_min_visits?: number | null
    loyalty_vip_min_visits?: number | null
  } | null>(null)

  // Load salon discounts and thresholds
  useEffect(() => {
    const loadSalonSettings = async () => {
      const { data, error } = await supabase
        .from('salons')
        .select('loyalty_bronze_discount, loyalty_silver_discount, loyalty_gold_discount, loyalty_platinum_discount, loyalty_vip_discount, loyalty_silver_min_visits, loyalty_gold_min_visits, loyalty_platinum_min_visits, loyalty_vip_min_visits')
        .eq('id', profile.salon_id)
        .single()
      
      if (!error && data) {
        setSalonDiscounts({
          loyalty_bronze_discount: data.loyalty_bronze_discount,
          loyalty_silver_discount: data.loyalty_silver_discount,
          loyalty_gold_discount: data.loyalty_gold_discount,
          loyalty_platinum_discount: data.loyalty_platinum_discount,
          loyalty_vip_discount: data.loyalty_vip_discount,
        })
        setSalonThresholds({
          loyalty_silver_min_visits: data.loyalty_silver_min_visits,
          loyalty_gold_min_visits: data.loyalty_gold_min_visits,
          loyalty_platinum_min_visits: data.loyalty_platinum_min_visits,
          loyalty_vip_min_visits: data.loyalty_vip_min_visits,
        })
      }
    }
    
    loadSalonSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.salon_id])

  // Available services
  const availableServices = [
    'Kesim',
    'Fön',
    'Boya',
    'Makyaj',
    'Kaş',
    'Kirpik',
    'Cilt Bakımı',
    'Masaj',
    'Manikür',
    'Pedikür',
    'Saç Bakımı',
    'Diğer'
  ]

  const handleServiceSelect = (service: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        return prev.filter((s) => s !== service)
      } else {
        return [...prev, service]
      }
    })
  }

  const handleServiceConfirm = () => {
    if (selectedServices.length === 0) {
      showToast('Lütfen en az bir işlem seçin', 'error')
      return
    }
    setShowServiceSelectModal(false)
    handleStartVisit()
  }

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
          notes: editedCustomer.notes || null,
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
      setTokenId(data.id)
      setExpiresAt(expiresAtDate)
      const baseUrl = getAppUrl()
      // Pass services as query parameter
      const servicesParam = encodeURIComponent(JSON.stringify(selectedServices))
      const checkinUrl = `${baseUrl}/checkin?token=${tokenValue}&services=${servicesParam}`
      setQrUrl(checkinUrl)
      setShowQRModal(true)
    } else {
      console.error('Token creation error:', error)
      showToast('Ziyaret başlatılamadı', 'error')
    }
  }

  const handleStartVisitClick = () => {
    setSelectedServices([])
    setShowServiceSelectModal(true)
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar
                </label>
                <textarea
                  value={editedCustomer.notes || ''}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, notes: e.target.value })}
                  placeholder="Müşteri hakkında notlar... (Örn: Türk kahvesini tek şekerli içer)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-blue-500 focus:ring-blue-500 min-h-[100px] resize-y"
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Bu notlar sadece salon personeli tarafından görülebilir
                </p>
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
            onClick={handleStartVisitClick}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            <QrCode className="mr-2 h-5 w-5" />
            Ziyaret Başlat
          </Button>
        </div>
      </Card>

      {/* Notes Card */}
      {(customer as any).notes && (
        <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notlar</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {(customer as any).notes}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Loyalty Level Card */}
      {(() => {
        const currentLevel = getLoyaltyLevel(visitCount, salonThresholds || undefined)
        const levelInfo = getLoyaltyLevelInfo(currentLevel, salonDiscounts || undefined, salonThresholds || undefined)
        const nextLevel = getNextLevel(currentLevel)
        const nextLevelInfo = nextLevel ? getLoyaltyLevelInfo(nextLevel, salonDiscounts || undefined, salonThresholds || undefined) : null
        const progress = nextLevelInfo 
          ? Math.min(100, (visitCount / nextLevelInfo.minVisits) * 100)
          : 100

        return (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">Sadakat Seviyesi</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{levelInfo.icon}</span>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{levelInfo.name}</p>
                    <p className="text-sm text-gray-600">%{levelInfo.discount} indirim hakkı</p>
                  </div>
                </div>
                {nextLevelInfo && (
                  <p className="mt-2 text-xs text-gray-500">
                    {nextLevelInfo.minVisits - visitCount} ziyaret sonra {nextLevelInfo.name} seviyesine geç
                  </p>
                )}
                {!nextLevelInfo && (
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    En yüksek seviyedesiniz! 🎉
                  </p>
                )}
              </div>
              <div className="w-32">
                <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div 
                    className="h-3 rounded-full transition-all"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: levelInfo.color 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-1">
                  {visitCount} / {nextLevelInfo?.minVisits || '∞'} ziyaret
                </p>
              </div>
            </div>
            
            {/* Loyalty Discount Button */}
            {(customer as any).has_loyalty_discount && !(customer as any).loyalty_discount_used_at && (
              <Button
                onClick={async () => {
                  const confirmed = window.confirm(
                    `Müşterinin %${levelInfo.discount} sadakat indirimini kullanmak istediğinizden emin misiniz?`
                  )
                  if (!confirmed) return
                  
                  const { error } = await supabase
                    .from('customers')
                    .update({
                      loyalty_discount_used_at: new Date().toISOString(),
                    })
                    .eq('id', customer.id)
                  
                  if (error) {
                    showToast('İndirim kullanılırken bir hata oluştu.', 'error')
                    console.error('Loyalty discount usage error:', error)
                  } else {
                    showToast(`%${levelInfo.discount} sadakat indirimi kullanıldı!`, 'success')
                    router.refresh()
                  }
                }}
                className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                <Star className="mr-2 h-4 w-4" />
                %{levelInfo.discount} Sadakat İndirimi Kullan
              </Button>
            )}
            {(customer as any).loyalty_discount_used_at && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Kullanıldı: {new Date((customer as any).loyalty_discount_used_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            )}
          </Card>
        )
      })()}

      {/* Referral Card */}
      {(customer as any).referral_code && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Referans Kodu
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <code className="text-xl font-bold text-purple-600 bg-white px-4 py-2 rounded-lg border-2 border-purple-200">
                  {(customer as any).referral_code}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const referralLink = `${getAppUrl()}/register?salon_id=${profile.salon_id}&ref=${(customer as any).referral_code}`
                    navigator.clipboard.writeText(referralLink)
                    showToast('Referans linki kopyalandı!', 'success')
                  }}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {(customer as any).referral_count || 0} kişi sizin referansınızla kayıt oldu
              </p>
              
              {/* Referral Discount Button */}
              {(customer as any).has_referral_discount && !(customer as any).referral_discount_used_at && (
                <Button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      'Müşterinin %15 referans indirimini kullanmak istediğinizden emin misiniz?'
                    )
                    if (!confirmed) return
                    
                    const { error } = await supabase
                      .from('customers')
                      .update({
                        referral_discount_used_at: new Date().toISOString(),
                      })
                      .eq('id', customer.id)
                    
                    if (error) {
                      showToast('İndirim kullanılırken bir hata oluştu.', 'error')
                      console.error('Referral discount usage error:', error)
                    } else {
                      showToast('%15 referans indirimi kullanıldı!', 'success')
                      router.refresh()
                    }
                  }}
                  className="w-full bg-purple-600 text-white hover:bg-purple-700"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  %15 Referans İndirimi Kullan
                </Button>
              )}
              {(customer as any).referral_discount_used_at && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Kullanıldı: {new Date((customer as any).referral_discount_used_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Welcome Discount Card */}
      {customer.has_welcome_discount && (
        <Card className="rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  Hoş Geldin İndirimi
                </h3>
                <p className="mb-3 text-sm text-gray-600">
                  {customer.welcome_discount_used_at
                    ? 'Bu indirim kullanılmış.'
                    : 'Müşteriniz %15 hoş geldin indirimi kazanmış. İstediği zaman kullanabilir.'}
                </p>
                {!customer.welcome_discount_used_at && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        'Müşterinin %15 hoş geldin indirimini kullanmak istediğinizden emin misiniz?'
                      )
                      if (!confirmed) return

                      const { error } = await supabase
                        .from('customers')
                        .update({
                          welcome_discount_used_at: new Date().toISOString(),
                        })
                        .eq('id', customer.id)

                      if (error) {
                        showToast('İndirim kullanılırken bir hata oluştu.', 'error')
                        console.error('Discount usage error:', error)
                      } else {
                        showToast('İndirim başarıyla kullanıldı!', 'success')
                        // Refresh page to show updated status
                        router.refresh()
                      }
                    }}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    İndirimi Kullan
                  </Button>
                )}
                {customer.welcome_discount_used_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Kullanıldı: {new Date(customer.welcome_discount_used_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

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
              const services = (visit as any).services || []
              
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
                      {services.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {services.map((service: string, idx: number) => (
                            <Badge key={idx} variant="default" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      )}
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

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Adisyon Geçmişi</h2>
            <Badge variant="default">{invoices.length} adisyon</Badge>
          </div>
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const invoiceDate = new Date(invoice.created_at)
              const isToday = invoiceDate.toDateString() === new Date().toDateString()
              
              return (
                <Card key={invoice.id} className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-5 w-5 text-blue-600" />
                        <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">
                          {invoiceDate.toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {isToday && (
                          <Badge variant="success" className="text-xs">Bugün</Badge>
                        )}
                      </div>
                      
                      {/* Services */}
                      {invoice.invoice_items && invoice.invoice_items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {invoice.invoice_items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {item.service_name} {item.quantity > 1 && `x${item.quantity}`}
                              </span>
                              <span className="font-medium text-gray-900">
                                {item.total_price.toFixed(2)} ₺
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Staff */}
                      {invoice.invoice_staff && invoice.invoice_staff.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {invoice.invoice_staff.map((is, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {is.staff?.full_name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {invoice.discount_amount > 0 && (
                        <p className="text-sm text-gray-500 line-through">
                          {invoice.subtotal.toFixed(2)} ₺
                        </p>
                      )}
                      <p className="text-xl font-bold text-green-600">
                        {invoice.total_amount.toFixed(2)} ₺
                      </p>
                      {invoice.discount_percentage > 0 && (
                        <p className="text-xs text-red-600">
                          %{invoice.discount_percentage} indirim
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Service Select Modal */}
      {showServiceSelectModal && (
        <Modal isOpen={true} onClose={() => {
          setShowServiceSelectModal(false)
          setSelectedServices([])
        }} title={`İşlem Seç - ${customer.full_name}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Yaptırılan işlemleri seçin:</p>
            <div className="grid grid-cols-2 gap-3">
              {availableServices.map((service) => (
                <button
                  key={service}
                  onClick={() => handleServiceSelect(service)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selectedServices.includes(service)
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{service}</span>
                    {selectedServices.includes(service) && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <X className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => {
                setShowServiceSelectModal(false)
                setSelectedServices([])
              }} className="flex-1">
                İptal
              </Button>
              <Button onClick={handleServiceConfirm} disabled={selectedServices.length === 0} className="flex-1">
                Devam Et ({selectedServices.length})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Modal */}
      {showQRModal && qrUrl && qrToken && tokenId && (
        <QRModal
          customerName={customer.full_name}
          qrUrl={qrUrl}
          qrToken={qrToken}
          tokenId={tokenId}
          expiresAt={expiresAt}
          services={selectedServices}
          onClose={() => {
            setShowQRModal(false)
            setQrToken(null)
            setTokenId(null)
            setQrUrl(null)
            setExpiresAt(null)
            setSelectedServices([])
          }}
          onRegenerate={handleStartVisitClick}
        />
      )}
    </div>
  )
}

function QRModal({
  customerName,
  qrUrl,
  qrToken,
  tokenId,
  expiresAt,
  services = [],
  onClose,
  onRegenerate,
}: {
  customerName: string
  qrUrl: string
  qrToken: string
  tokenId: string
  expiresAt: Date | null
  services?: string[]
  onClose: () => void
  onRegenerate: () => void
}) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [status, setStatus] = useState<'waiting' | 'expired' | 'confirmed'>('waiting')

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

  // Poll for token usage status
  useEffect(() => {
    if (!qrToken || status !== 'waiting') return

    const checkTokenStatus = async () => {
      const { data, error } = await supabase
        .from('visit_tokens')
        .select('used_at')
        .eq('token', qrToken)
        .single()

      if (!error && data && data.used_at) {
        // Token has been used - show success and close modal
        setStatus('confirmed')
        showToast('Ziyaret başarıyla onaylandı!', 'success')
        setTimeout(() => {
          onClose()
        }, 2000) // Close after 2 seconds
      }
    }

    // Check every 2 seconds
    const interval = setInterval(checkTokenStatus, 2000)
    return () => clearInterval(interval)
  }, [qrToken, status, onClose, showToast, supabase])

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

        {/* QR Code with Services */}
        <div className="relative flex items-center justify-center w-full">
          {/* Left Services - Absolute positioned */}
          {services.length > 0 && (
            <div className="absolute left-0 top-0 flex flex-col gap-2 max-w-[200px]">
              <h3 className="text-lg font-semibold text-white mb-2">Yapılan İşlemler</h3>
              {services.map((service) => (
                <Badge key={service} variant="default" className="bg-white/20 text-white whitespace-nowrap">
                  {service}
                </Badge>
              ))}
            </div>
          )}

          {/* QR Code - Centered */}
          <div className="rounded-2xl border-4 border-white bg-white p-6 shadow-2xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrUrl)}&margin=1`}
              alt="QR Code"
              className="h-auto w-full max-w-md"
            />
          </div>
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
                    width: `${(timeRemaining / 90) * 100}%`,
                  }}
                />
              </div>
            </>
          ) : status === 'confirmed' ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                  <svg
                    className="h-10 w-10 text-white"
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
              <p className="text-2xl font-semibold text-green-400">
                Ziyaret Onaylandı!
              </p>
              <p className="mt-2 text-gray-300">
                Modal kapanıyor...
              </p>
            </div>
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


