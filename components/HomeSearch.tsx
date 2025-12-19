'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import { Search, Plus, Calendar, Users, Clock, X, ArrowRight, Home } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { LoadingSkeleton, CustomerCardSkeleton } from '@/components/ui/LoadingSkeleton'
import Modal from '@/components/ui/Modal'
import { getAppUrl } from '@/lib/utils'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

interface HomeSearchProps {
  profile: Profile
  todayVisits: number
  recentCustomers: Customer[]
}

export default function HomeSearch({ profile, todayVisits, recentCustomers: initialRecentCustomers }: HomeSearchProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQuickVisitModal, setShowQuickVisitModal] = useState(false)
  const [quickVisitCustomer, setQuickVisitCustomer] = useState<Customer | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const performSearch = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .or(`phone.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .limit(10)

    if (!error && data) {
      setSearchResults(data)
    }
    setLoading(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Enter' && searchResults.length > 0 && document.activeElement === searchInputRef.current) {
        e.preventDefault()
        handleCustomerClick(searchResults[0])
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchResults, searchQuery])

  const handleCustomerClick = (customer: Customer) => {
    router.push(`/customers/${customer.id}`)
  }

  const handleQuickVisit = async (customer: Customer) => {
    setQuickVisitCustomer(customer)
    setShowQuickVisitModal(true)
  }

  const handleCreateCustomer = async (
    name: string,
    phone: string,
    province?: string,
    district?: string,
    birthDay?: number,
    birthMonth?: number
  ) => {
    try {
      // Clean up empty strings - only use if they have actual values
      const provinceValue = province?.trim() || null
      const districtValue = district?.trim() || null

      // Build insert object - start with only required fields
      // Her kelimenin ilk harfini büyük yap
      const capitalizeWords = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
      
      const insertData: any = {
        salon_id: profile.salon_id,
        full_name: capitalizeWords(name),
        phone: phone.trim(),
        kvkk_consent_at: new Date().toISOString(),
      }
      
      // Add optional fields if provided
      if (provinceValue) insertData.province = provinceValue
      if (districtValue) insertData.district = districtValue
      if (birthDay) insertData.birth_day = birthDay
      if (birthMonth) insertData.birth_month = birthMonth

      console.log('Attempting to insert customer with data:', JSON.stringify(insertData, null, 2))
      console.log('Profile salon_id:', profile.salon_id)
      
      const result = await supabase
        .from('customers')
        .insert(insertData)
        .select()
        .single()

      const { data, error } = result
      
      console.log('Insert result:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : null,
        errorType: error ? typeof error : null,
        errorKeys: error ? Object.keys(error) : [],
      })
      
      if (error) {
        // Extract error information - error has code, details, hint, message properties
        const errorCode = error.code || ''
        const errorMessage = error.message || ''
        const errorDetails = error.details || ''
        const errorHint = error.hint || ''
        
        // Log detailed error information
        console.error('Customer creation error:', {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          hint: errorHint,
          insertData,
          profileSalonId: profile.salon_id
        })
        
        // Combine all error messages for checking
        const fullErrorMessage = errorMessage || errorDetails || errorHint || ''
        
        // Check for specific error types
        if (errorCode === '23505' || fullErrorMessage.includes('unique') || fullErrorMessage.includes('duplicate')) {
          showToast('Bu telefon numarası zaten kayıtlı', 'error')
        } else if (errorCode === 'PGRST204' || (fullErrorMessage.includes('column') && (fullErrorMessage.includes('does not exist') || fullErrorMessage.includes('Could not find')))) {
          // Column doesn't exist in schema - try with only required fields
          console.error('Schema cache issue - column not found:', fullErrorMessage)
          console.log('Retrying with only required fields (salon_id, full_name, phone, kvkk_consent_at)...')
          
          // Retry with only required fields - no optional columns
            // Her kelimenin ilk harfini büyük yap
            const capitalizeWords = (str: string) => {
              return str
                .toLowerCase()
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            
            const retryData: any = {
              salon_id: profile.salon_id,
              full_name: capitalizeWords(name),
              phone: phone.trim(),
              kvkk_consent_at: new Date().toISOString(),
            }
          
          const { data: retryDataResult, error: retryError } = await supabase
            .from('customers')
            .insert(retryData)
            .select()
            .single()
          
          if (retryError) {
            console.error('Retry error:', retryError)
            showToast('Veritabanı şeması güncel değil. Lütfen migration çalıştırın.', 'error')
          } else if (retryDataResult) {
            const missingFields = []
            if (provinceValue) missingFields.push('İl')
            if (districtValue) missingFields.push('İlçe')
            if (birthDay || birthMonth) missingFields.push('Doğum Günü')
            
            const missingFieldsText = missingFields.length > 0 
              ? ` (${missingFields.join(', ')} bilgisi kaydedilemedi - migration gerekli)`
              : ''
            
            showToast(`Müşteri başarıyla eklendi${missingFieldsText}`, 'success')
            setShowCreateModal(false)
            router.push(`/customers/${retryDataResult.id}`)
          }
        } else if (errorCode === 'PGRST301' || fullErrorMessage.includes('permission denied') || fullErrorMessage.includes('policy') || fullErrorMessage.includes('RLS') || fullErrorMessage.includes('row-level security')) {
          // RLS policy error
          showToast('Yetki hatası: Müşteri ekleme izniniz yok. Lütfen yönetici ile iletişime geçin.', 'error')
        } else {
          // Show the actual error message
          const displayMessage = errorMessage || errorDetails || errorHint || 'Müşteri eklenirken hata oluştu'
          showToast(displayMessage, 'error')
        }
        return
      }

      if (data) {
        showToast('Müşteri başarıyla eklendi', 'success')
        setShowCreateModal(false)
        router.push(`/customers/${data.id}`)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    }
  }

  const hasSearchResults = searchQuery.length >= 2
  const showRecent = !hasSearchResults && initialRecentCustomers.length > 0

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bugünkü Ziyaretler</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{todayVisits}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Müşteri</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{initialRecentCustomers.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6 sm:col-span-2 lg:col-span-1">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
            className="h-full w-full"
          >
            <Plus className="mr-2 h-5 w-5" />
            Yeni Müşteri
          </Button>
        </Card>
        <Card className="p-6 sm:col-span-2 lg:col-span-1">
          <Button
            onClick={() => {
              if (searchResults.length > 0) {
                handleQuickVisit(searchResults[0])
              } else if (initialRecentCustomers.length > 0) {
                handleQuickVisit(initialRecentCustomers[0])
              } else {
                showToast('Önce bir müşteri seçin', 'error')
              }
            }}
            size="lg"
            variant="secondary"
            className="h-full w-full"
          >
            <Clock className="mr-2 h-5 w-5" />
            Hızlı Ziyaret
          </Button>
        </Card>
      </div>

      {/* Search Section */}
      <Card className="border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Müşteri ara (isim veya telefon)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 pr-12 text-base text-black"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Temizle"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {hasSearchResults && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <span>Aranıyor...</span>
                </>
              ) : (
                <span>
                  <strong>{searchResults.length}</strong> sonuç bulundu
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Search Results */}
      {hasSearchResults && (
        <div className="space-y-3">
          {loading ? (
            <>
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
            </>
          ) : searchResults.length > 0 ? (
            searchResults.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
                onQuickVisit={() => handleQuickVisit(customer)}
              />
            ))
          ) : (
            <Card className="p-12">
              <EmptyState
                title="Sonuç bulunamadı"
                description="Farklı bir arama terimi deneyin"
              />
            </Card>
          )}
        </div>
      )}

      {/* Recent Customers */}
      {showRecent && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Son Müşteriler</h2>
            <Badge variant="default">{initialRecentCustomers.length} müşteri</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {initialRecentCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
                onQuickVisit={() => handleQuickVisit(customer)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCustomer}
        />
      )}

      {/* Quick Visit Modal */}
      {showQuickVisitModal && quickVisitCustomer && (
        <QuickVisitModal
          customer={quickVisitCustomer}
          profile={profile}
          onClose={() => {
            setShowQuickVisitModal(false)
            setQuickVisitCustomer(null)
          }}
        />
      )}
    </div>
  )
}

function CustomerCard({ 
  customer, 
  onClick,
  onQuickVisit 
}: { 
  customer: Customer
  onClick: () => void
  onQuickVisit: () => void
}) {
  const lastVisitDate = customer.last_visit_at
    ? new Date(customer.last_visit_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <Card className="group cursor-pointer p-5 transition-all hover:shadow-lg hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="text-lg font-semibold text-gray-900 truncate">{customer.full_name}</h3>
          <p className="mt-1 text-sm text-gray-600">{customer.phone}</p>
          {lastVisitDate && (
            <p className="mt-2 text-xs text-gray-500">
              Son ziyaret: {lastVisitDate}
            </p>
          )}
          {!lastVisitDate && (
            <Badge variant="warning" className="mt-2 text-xs">Yeni</Badge>
          )}
        </div>
        <div className="ml-3 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickVisit()
            }}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function QuickVisitModal({
  customer,
  profile,
  onClose,
}: {
  customer: Customer
  profile: Profile
  onClose: () => void
}) {
  const router = useRouter()
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const generateToken = async () => {
      const tokenValue = crypto.randomUUID()
      const expiresAtDate = new Date(Date.now() + 90 * 1000)

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
        const baseUrl = getAppUrl()
        const fullUrl = `${baseUrl}/checkin?token=${tokenValue}`
        console.log('QR Code URL:', fullUrl) // Debug: QR kod URL'sini kontrol et
        console.log('Token expires at:', expiresAtDate.toISOString()) // Debug: Token expiration
        setQrUrl(fullUrl)
      } else {
        console.error('Token creation error:', error)
      }
    }

    generateToken()
  }, [])

  useEffect(() => {
    if (!expiresAt) return

    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeRemaining(remaining)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleHomeClick = () => {
    onClose() // Modal'ı kapat
    router.push('/home') // Ana sayfaya git
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4">
      <button
        onClick={handleHomeClick}
        className="cursor-pointer fixed left-4 top-4 z-50 rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Ana Sayfa"
      >
        <Home className="h-6 w-6" />
      </button>
      <div className="flex w-full max-w-4xl flex-col items-center space-y-8 text-center">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{customer.full_name}</h2>
          <p className="mt-2 text-lg text-gray-300">QR kodu tarayarak ziyareti onaylayın</p>
        </div>

        {qrUrl && (
          <>
            <div className="rounded-2xl border-4 border-white bg-white p-6 shadow-2xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrUrl)}&margin=1`}
                alt="QR Code"
                className="h-auto w-full max-w-md"
              />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-white sm:text-6xl">{timeRemaining}s</p>
                <p className="mt-2 text-lg text-gray-300">Kalan süre</p>
              </div>
              <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-700 sm:w-96">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${(timeRemaining / 90) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}

        <Button variant="secondary" onClick={onClose} className="bg-gray-700 text-white hover:bg-gray-600">
          Kapat
        </Button>
      </div>
    </div>
  )
}

function CreateCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, phone: string, province?: string, district?: string, birthDay?: number, birthMonth?: number) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [birthDay, setBirthDay] = useState<number | ''>('')
  const [birthMonth, setBirthMonth] = useState<number | ''>('')
  const [consent, setConsent] = useState(false)

  // İl değiştiğinde ilçe listesini sıfırla
  const handleProvinceChange = (selectedProvince: string) => {
    setProvince(selectedProvince)
    setDistrict('') // İl değişince ilçeyi sıfırla
  }

  // Seçilen ile göre ilçe listesi
  const districts = province ? (turkeyCities[province] || []) : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && phone && phone.length === 10 && consent) {
      // Telefon numarasını +90 ile birleştir
      const fullPhone = `+90${phone}`
      onCreate(
        name, 
        fullPhone, 
        province || undefined, 
        district || undefined, 
        birthDay ? Number(birthDay) : undefined,
        birthMonth ? Number(birthMonth) : undefined
      )
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Yeni Müşteri Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ad Soyad
          </label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => {
              const value = e.target.value
              // Her kelimenin ilk harfini büyük yap
              const capitalized = value
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              setName(capitalized)
            }}
            autoFocus
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
              required
              value={phone}
              onChange={(e) => {
                // Sadece rakamları kabul et ve maksimum 10 karakter
                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                setPhone(value)
              }}
              placeholder="5551234567"
              className="pl-12"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İl
          </label>
          <select
            value={province}
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
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={!province}
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
        <div className="flex items-center">
          <input
            type="checkbox"
            required
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="consent" className="ml-2 text-sm text-gray-700">
            KVKK Onayı
          </label>
        </div>
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            İptal
          </Button>
          <Button type="submit" className="flex-1" disabled={!name || !phone || phone.length !== 10 || !consent}>
            Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  )
}
