'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

export default function CustomerSearch({ profile, showCreateButton = true }: { profile: Profile; showCreateButton?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchCustomers()
    } else {
      setCustomers([])
    }
  }, [searchQuery])

  const searchCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .or(`phone.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .limit(10)

    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
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
      setSelectedCustomer(data)
      setShowCreateModal(false)
      setSearchQuery('')
      setCustomers([])
    }
  }

  // Load all customers on mount for owner
  useEffect(() => {
    if (profile.role === 'OWNER' && searchQuery.length === 0) {
      loadAllCustomers()
    }
  }, [profile.role])

  const loadAllCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Telefon veya isim ile ara..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        {showCreateButton && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Yeni Müşteri
          </button>
        )}
      </div>

      {loading && <p className="text-gray-600">Aranıyor...</p>}

      {!loading && searchQuery.length === 0 && customers.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">Henüz müşteri yok. İlk müşteriyi eklemek için "Yeni Müşteri" butonuna tıklayın.</p>
        </div>
      )}

      {customers.length > 0 && (
        <div className="space-y-2">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{customer.full_name}</p>
                <p className="text-sm text-gray-600">{customer.phone}</p>
                {customer.last_visit_at && (
                  <p className="text-xs text-gray-500">
                    Last visit: {new Date(customer.last_visit_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(customer)}
                className="rounded-lg bg-green-600 px-6 py-2 text-lg font-medium text-white hover:bg-green-700"
              >
                Ziyaret Başlat
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCustomer}
        />
      )}

      {selectedCustomer && (
        <VisitSessionModal
          customer={selectedCustomer}
          profile={profile}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Yeni Müşteri Ekle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              type="text"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">İl</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="İl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">İlçe</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="İlçe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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
              className="h-4 w-4"
            />
            <label htmlFor="consent" className="ml-2 text-sm text-gray-700">
              KVKK Consent
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VisitSessionModal({
  customer,
  profile,
  onClose,
}: {
  customer: Customer
  profile: Profile
  onClose: () => void
}) {
  const [token, setToken] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const supabase = createClient()

  const generateVisitToken = async () => {
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
      setToken(tokenValue)
      setExpiresAt(expiresAtDate)
      const checkinUrl = `${window.location.origin}/checkin?token=${tokenValue}`
      setQrUrl(checkinUrl)
    }
  }

  useEffect(() => {
    generateVisitToken()
  }, [])

  const timeRemaining = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ziyaret Oturumu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="mb-4">
          <p className="text-lg font-medium">{customer.full_name}</p>
          <p className="text-gray-600">{customer.phone}</p>
        </div>
        {qrUrl && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border-4 border-blue-500 p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code"
                className="h-64 w-64"
              />
            </div>
            <p className="text-lg font-medium">
              Time remaining: {timeRemaining}s
            </p>
            <p className="text-sm text-gray-600">
              Müşteri bu QR kodu tarayarak ziyareti onaylamalı
            </p>
          </div>
        )}
        {timeRemaining === 0 && (
          <button
            onClick={generateVisitToken}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700"
          >
            Yeni QR Kod Oluştur
          </button>
        )}
      </div>
    </div>
  )
}

