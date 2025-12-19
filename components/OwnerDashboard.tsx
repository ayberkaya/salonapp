'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { smsProvider } from '@/lib/sms'
import CustomerSearch from './CustomerSearch'
import { turkeyProvinces, turkeyCities } from '@/lib/data/turkey-cities'

// CreateCustomerModal component (copied from CustomerSearch for reuse)
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
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                +90
              </span>
              <input
                type="tel"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 pl-12"
                value={phone}
                onChange={(e) => {
                  // Sadece rakamları kabul et ve maksimum 10 karakter
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setPhone(value)
                }}
                placeholder="5551234567"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">İl</label>
            <select
              value={province}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700">İlçe</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!province}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Doğum Günü</label>
            <div className="flex gap-2">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              KVKK Onayı
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              className="cursor-pointer flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type Profile = Database['public']['Tables']['profiles']['Row']
type Salon = Database['public']['Tables']['salons']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

export default function OwnerDashboard({ profile, salon }: { profile: Profile; salon: Salon | null }) {
  const [inactiveCustomers, setInactiveCustomers] = useState<Customer[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [campaignMessage, setCampaignMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadInactiveCustomers()
    loadTopCustomers()
  }, [])

  const loadInactiveCustomers = async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .or(`last_visit_at.is.null,last_visit_at.lt.${thirtyDaysAgo.toISOString()}`)
      .order('last_visit_at', { ascending: true, nullsFirst: true })

    if (data) {
      setInactiveCustomers(data)
    }
  }

  const loadTopCustomers = async () => {
    const { data: visits } = await supabase
      .from('visits')
      .select('customer_id, customers(*)')
      .eq('salon_id', profile.salon_id)

    if (visits) {
      const visitCounts = new Map<string, { customer: Customer; count: number }>()
      
      visits.forEach((visit: any) => {
        const customerId = visit.customer_id
        const customer = visit.customers as Customer
        
        if (visitCounts.has(customerId)) {
          visitCounts.get(customerId)!.count++
        } else {
          visitCounts.set(customerId, { customer, count: 1 })
        }
      })

      const top = Array.from(visitCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setTopCustomers(top)
    }
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomers)
    if (newSet.has(customerId)) {
      newSet.delete(customerId)
    } else {
      newSet.add(customerId)
    }
    setSelectedCustomers(newSet)
  }

  const handleSendCampaign = async () => {
    if (selectedCustomers.size === 0 || !campaignMessage.trim()) {
      return
    }

    setSending(true)

    const selected = inactiveCustomers.filter(c => selectedCustomers.has(c.id))
    
    for (const customer of selected) {
      await smsProvider.sendCampaign(customer.phone, campaignMessage)
    }

    setSending(false)
    setSelectedCustomers(new Set())
    setCampaignMessage('')
    alert(`Campaign sent to ${selected.length} customers`)
  }

  return (
    <div className="space-y-8">
      {/* Customer Management Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Müşteri Yönetimi</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Yeni Müşteri Ekle
          </button>
        </div>
        <CustomerSearch profile={profile} showCreateButton={false} />
        
        {showCreateModal && (
          <CreateCustomerModal
            onClose={() => setShowCreateModal(false)}
            onCreate={async (
              name: string,
              phone: string,
              province?: string,
              district?: string,
              birthDay?: number,
              birthMonth?: number
            ) => {
              // Her kelimenin ilk harfini büyük yap
              const capitalizeWords = (str: string) => {
                return str
                  .toLowerCase()
                  .trim()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              }
              
              const { error } = await supabase
                .from('customers')
                .insert({
                  salon_id: profile.salon_id,
                  full_name: capitalizeWords(name),
                  phone: phone,
                  province: province || null,
                  district: district || null,
                  birth_day: birthDay || null,
                  birth_month: birthMonth || null,
                  kvkk_consent_at: new Date().toISOString(),
                })
              
              if (!error) {
                setShowCreateModal(false)
                loadInactiveCustomers()
                // Refresh customer search
                window.location.reload()
              } else {
                alert('Hata: ' + error.message)
              }
            }}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">Pasif Müşteriler (30+ gün)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {inactiveCustomers.length === 0 ? (
              <p className="text-gray-500">Pasif müşteri yok</p>
            ) : (
              inactiveCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between rounded border border-gray-200 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    {customer.last_visit_at && (
                      <p className="text-xs text-gray-500">
                        Last visit: {new Date(customer.last_visit_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(customer.id)}
                    onChange={() => toggleCustomerSelection(customer.id)}
                    className="h-5 w-5"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">En Çok Gelen Müşteriler</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topCustomers.length === 0 ? (
              <p className="text-gray-500">Henüz ziyaret yok</p>
            ) : (
              topCustomers.map((item) => (
                <div
                  key={item.customer.id}
                  className="flex items-center justify-between rounded border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium">{item.customer.full_name}</p>
                    <p className="text-sm text-gray-600">{item.customer.phone}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    {item.count} ziyaret
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedCustomers.size > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">
            SMS Kampanyası Gönder ({selectedCustomers.size} seçili)
          </h2>
          <div className="space-y-4">
            <textarea
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Kampanya mesajınızı yazın..."
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
            />
            <button
              onClick={handleSendCampaign}
              disabled={sending || !campaignMessage.trim()}
              className="cursor-pointer w-full rounded-lg bg-green-600 px-4 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Gönderiliyor...' : 'SMS Kampanyası Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

