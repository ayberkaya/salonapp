'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { LoadingSkeleton, CustomerCardSkeleton } from '@/components/ui/LoadingSkeleton'
import Modal from '@/components/ui/Modal'

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
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Enter to open first result
      if (e.key === 'Enter' && searchResults.length > 0 && document.activeElement === searchInputRef.current) {
        e.preventDefault()
        handleCustomerClick(searchResults[0])
      }
      // Esc to clear
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

  const handleCreateCustomer = async (
    name: string,
    phone: string,
    province?: string,
    district?: string,
    dateOfBirth?: string
  ) => {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        salon_id: profile.salon_id,
        full_name: name,
        phone: phone,
        province: province || null,
        district: district || null,
        date_of_birth: dateOfBirth || null,
        kvkk_consent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!error && data) {
      showToast('Müşteri başarıyla eklendi', 'success')
      setShowCreateModal(false)
      router.push(`/customers/${data.id}`)
    } else {
      showToast('Müşteri eklenirken hata oluştu', 'error')
    }
  }

  const hasSearchResults = searchQuery.length >= 2
  const showRecent = !hasSearchResults && initialRecentCustomers.length > 0

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Telefon veya isim ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-lg h-14 pr-12 text-black leading-[0px]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="whitespace-nowrap"
            >
              + Yeni Müşteri
            </Button>
          </div>

          {hasSearchResults && (
            <div className="text-sm text-gray-500">
              {loading ? 'Aranıyor...' : `${searchResults.length} sonuç bulundu`}
            </div>
          )}
        </div>
      </Card>

      {/* Today's Stats */}
      {!hasSearchResults && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bugünkü Ziyaretler</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{todayVisits}</p>
              </div>
              <Badge variant="success">{todayVisits} ziyaret</Badge>
            </div>
          </Card>
        </div>
      )}

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
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Son Müşteriler</h2>
          <div className="space-y-3">
            {initialRecentCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
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
    </div>
  )
}

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer p-4 transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{customer.full_name}</h3>
          <p className="mt-1 text-sm text-gray-600">{customer.phone}</p>
          {customer.last_visit_at && (
            <p className="mt-1 text-xs text-gray-500">
              Son ziyaret: {new Date(customer.last_visit_at).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  )
}

function CreateCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, phone: string, province?: string, district?: string, dateOfBirth?: string) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [consent, setConsent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && phone && consent) {
      onCreate(name, phone, province || undefined, district || undefined, dateOfBirth || undefined)
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
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefon
          </label>
          <Input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+90 555 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İl
          </label>
          <Input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="İl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İlçe
          </label>
          <Input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="İlçe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doğum Tarihi
          </label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
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
          <Button type="submit" className="flex-1" disabled={!name || !phone || !consent}>
            Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  )
}

