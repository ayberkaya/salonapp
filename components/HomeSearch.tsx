'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import { Search, Plus, Calendar, Users, Clock, X, ArrowRight, Home, Receipt } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { LoadingSkeleton, CustomerCardSkeleton } from '@/components/ui/LoadingSkeleton'
import Modal from '@/components/ui/Modal'
import { getAppUrl } from '@/lib/utils'
import InvoiceModal from '@/components/InvoiceModal'

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
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>(initialRecentCustomers)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQuickVisitModal, setShowQuickVisitModal] = useState(false)
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)
  const [showServiceSelectModal, setShowServiceSelectModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [quickVisitCustomer, setQuickVisitCustomer] = useState<Customer | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  
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

  const handleQuickVisit = async (customer?: Customer) => {
    if (customer) {
      // Müşteri seçildi, işlem seçimine geç
      setQuickVisitCustomer(customer)
      setSelectedServices([])
      setShowServiceSelectModal(true)
    } else {
      // Her zaman müşteri seçim modalını aç
      setShowCustomerSelectModal(true)
    }
  }

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
        has_welcome_discount: true, // Hoş geldin indirimi ver
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

  const showRecent = recentCustomers.length > 0

  // Listen for customer deletion events
  useEffect(() => {
    const handleCustomerDeleted = (event: CustomEvent<{ customerId: string }>) => {
      setRecentCustomers(prev => prev.filter(c => c.id !== event.detail.customerId))
    }

    window.addEventListener('customerDeleted' as any, handleCustomerDeleted as EventListener)
    return () => {
      window.removeEventListener('customerDeleted' as any, handleCustomerDeleted as EventListener)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card style={{ padding: '16.8px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Bugünkü Ziyaretler</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{todayVisits}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '16.8px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Toplam Müşteri</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{recentCustomers.length}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="group relative overflow-hidden p-0 sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white transition-all duration-300 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ padding: '22.4px' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Yeni Müşteri</p>
              <p className="mt-0.5 text-xs text-blue-100">Hızlı kayıt</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 shimmer-effect" />
          </button>
        </Card>
        <Card className="group relative overflow-hidden p-0 sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <button
            onClick={() => {
              // Her zaman müşteri seçim modalını aç
              handleQuickVisit()
            }}
            className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 text-white transition-all duration-300 hover:from-gray-800 hover:via-gray-700 hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            style={{ padding: '22.4px' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
              <Clock className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Hızlı Ziyaret</p>
              <p className="mt-0.5 text-xs text-gray-300">Anında başlat</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 shimmer-effect" />
          </button>
        </Card>
        <Card className="group relative overflow-hidden p-0 sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white transition-all duration-300 hover:from-green-700 hover:via-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            style={{ padding: '22.4px' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Adisyon Ekle</p>
              <p className="mt-0.5 text-xs text-green-100">Hesap oluştur</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 shimmer-effect" />
          </button>
        </Card>
      </div>

      {/* Recent Customers */}
      {showRecent && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Son Müşteriler</h2>
            <Badge variant="default">{recentCustomers.length} müşteri</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
                onQuickVisit={(customer) => handleQuickVisit(customer)}
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

      {/* Customer Select Modal */}
      {showCustomerSelectModal && (
        <CustomerSelectModal
          customers={searchResults.length > 0 ? searchResults : recentCustomers}
          onSelect={(customer) => {
            setShowCustomerSelectModal(false)
            handleQuickVisit(customer)
          }}
          onClose={() => setShowCustomerSelectModal(false)}
          onSearch={() => {
            // Arama yapmak için modal'ı kapat ve arama kutusuna odaklan
            setShowCustomerSelectModal(false)
            searchInputRef.current?.focus()
          }}
        />
      )}

      {/* Service Select Modal */}
      {showServiceSelectModal && quickVisitCustomer && (
        <ServiceSelectModal
          customer={quickVisitCustomer}
          availableServices={availableServices}
          selectedServices={selectedServices}
          onServiceToggle={handleServiceSelect}
          onConfirm={handleServiceConfirm}
          onClose={() => {
            setShowServiceSelectModal(false)
            setQuickVisitCustomer(null)
            setSelectedServices([])
          }}
        />
      )}

      {/* Quick Visit Modal */}
      {showQuickVisitModal && quickVisitCustomer && (
        <QuickVisitModal
          customer={quickVisitCustomer}
          profile={profile}
          services={selectedServices}
          onClose={() => {
            setShowQuickVisitModal(false)
            setQuickVisitCustomer(null)
            setSelectedServices([])
          }}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          salonId={profile.salon_id}
          profileId={profile.id}
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
  onQuickVisit: (customer: Customer) => void
}) {
  const lastVisitDate = customer.last_visit_at
    ? new Date(customer.last_visit_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <Card className="group cursor-pointer p-3.5 transition-all hover:shadow-lg hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="text-base font-semibold text-gray-900 truncate">{customer.full_name}</h3>
          <p className="mt-0.5 text-sm text-gray-600">{customer.phone}</p>
          {lastVisitDate && (
            <p className="mt-1 text-xs text-gray-500">
              Son ziyaret: {lastVisitDate}
            </p>
          )}
          {!lastVisitDate && (
            <Badge variant="warning" className="mt-1 text-xs">Yeni</Badge>
          )}
        </div>
        <div className="ml-2 flex flex-col gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              // Direkt bu müşteri ile işlem seçimine geç
              onQuickVisit(customer)
            }}
            className="cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function CustomerSelectModal({
  customers,
  onSelect,
  onClose,
  onSearch,
}: {
  customers: Customer[]
  onSelect: (customer: Customer) => void
  onClose: () => void
  onSearch?: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter customers by name or phone
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      customer.full_name.toLowerCase().includes(query) ||
      customer.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
    )
  })

  return (
    <Modal isOpen={true} onClose={onClose} title="Müşteri Seç">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="İsim veya telefon ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-black"
            autoFocus
          />
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title={customers.length === 0 ? "Müşteri bulunamadı" : "Arama sonucu bulunamadı"}
              description={customers.length === 0 
                ? "Önce bir müşteri arayın veya yeni müşteri oluşturun"
                : "Farklı bir arama terimi deneyin"}
            />
            {onSearch && customers.length === 0 && (
              <Button onClick={onSearch} className="w-full">
                Müşteri Ara
              </Button>
            )}
          </div>
        ) : (
          <div className="max-h-96 space-y-1.5 overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:bg-gray-50 hover:shadow-md"
              >
                <p className="font-medium text-gray-900">{customer.full_name}</p>
                <p className="text-sm text-gray-600">{customer.phone}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ServiceSelectModal({
  customer,
  availableServices,
  selectedServices,
  onServiceToggle,
  onConfirm,
  onClose,
}: {
  customer: Customer
  availableServices: string[]
  selectedServices: string[]
  onServiceToggle: (service: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`İşlem Seç - ${customer.full_name}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Yaptırılan işlemleri seçin:</p>
        <div className="grid grid-cols-2 gap-3">
          {availableServices.map((service) => (
            <button
              key={service}
              onClick={() => onServiceToggle(service)}
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
          <Button variant="ghost" onClick={onClose} className="flex-1">
            İptal
          </Button>
          <Button onClick={onConfirm} disabled={selectedServices.length === 0} className="flex-1">
            Devam Et ({selectedServices.length})
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function QuickVisitModal({
  customer,
  profile,
  services,
  onClose,
}: {
  customer: Customer
  profile: Profile
  services: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const generateToken = async () => {
      const tokenValue = crypto.randomUUID()
      const expiresAtDate = new Date(Date.now() + 90 * 1000)

      // Store services in token metadata (we'll use a JSON field or store in a separate table)
      // For now, we'll pass services to the checkin API via token metadata
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
        // Pass services as query parameter (will be stored when visit is confirmed)
        const servicesParam = encodeURIComponent(JSON.stringify(services))
        const fullUrl = `${baseUrl}/checkin?token=${tokenValue}&services=${servicesParam}`
        setQrUrl(fullUrl)
      } else {
        console.error('Token creation error:', error)
        showToast('QR kod oluşturulurken hata oluştu', 'error')
      }
    }

    generateToken()
  }, [customer.id, profile.salon_id, profile.id, services, showToast])

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

  // Poll for token usage status
  useEffect(() => {
    if (!tokenId || !qrToken) return

    const checkTokenStatus = async () => {
      const { data, error } = await supabase
        .from('visit_tokens')
        .select('used_at')
        .eq('token', qrToken)
        .single()

      if (!error && data && data.used_at) {
        // Token has been used - close modal, show success message, and navigate to customer page
        showToast('Ziyaret başarıyla onaylandı!', 'success')
        setTimeout(() => {
          router.push(`/customers/${customer.id}`)
        }, 1000)
        onClose()
      }
    }

    // Check every 2 seconds
    const interval = setInterval(checkTokenStatus, 2000)
    return () => clearInterval(interval)
  }, [tokenId, qrToken, onClose, showToast, customer.id, router])

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
