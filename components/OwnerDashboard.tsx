'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { smsProvider } from '@/lib/sms'

type Profile = Database['public']['Tables']['profiles']['Row']
type Salon = Database['public']['Tables']['salons']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

export default function OwnerDashboard({ profile, salon }: { profile: Profile; salon: Salon | null }) {
  const [inactiveCustomers, setInactiveCustomers] = useState<Customer[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [campaignMessage, setCampaignMessage] = useState('')
  const [sending, setSending] = useState(false)
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {salon?.name || 'Owner Dashboard'}
        </h1>
        <p className="mt-2 text-gray-600">Welcome, {profile.full_name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">Inactive Customers (30+ days)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {inactiveCustomers.length === 0 ? (
              <p className="text-gray-500">No inactive customers</p>
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
          <h2 className="mb-4 text-xl font-bold">Top Visitors</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topCustomers.length === 0 ? (
              <p className="text-gray-500">No visits yet</p>
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
                    {item.count} visits
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
            Send Campaign ({selectedCustomers.size} selected)
          </h2>
          <div className="space-y-4">
            <textarea
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter your campaign message..."
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
            />
            <button
              onClick={handleSendCampaign}
              disabled={sending || !campaignMessage.trim()}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send SMS Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

