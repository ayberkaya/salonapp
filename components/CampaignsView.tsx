'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { smsProvider } from '@/lib/sms'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

interface CampaignsViewProps {
  profile: Profile
  inactiveCustomers: Customer[]
  topCustomers: Array<{ customer: Customer; count: number }>
}

export default function CampaignsView({
  profile,
  inactiveCustomers,
  topCustomers,
}: CampaignsViewProps) {
  const { showToast } = useToast()
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [campaignMessage, setCampaignMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const toggleCustomerSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomers)
    if (newSet.has(customerId)) {
      newSet.delete(customerId)
    } else {
      newSet.add(customerId)
    }
    setSelectedCustomers(newSet)
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === inactiveCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(inactiveCustomers.map((c) => c.id)))
    }
  }

  const handleSendCampaign = async () => {
    if (selectedCustomers.size === 0 || !campaignMessage.trim()) {
      return
    }

    setSending(true)
    const selected = inactiveCustomers.filter((c) => selectedCustomers.has(c.id))

    for (const customer of selected) {
      await smsProvider.sendCampaign(customer.phone, campaignMessage)
    }

    setSending(false)
    setSelectedCustomers(new Set())
    setCampaignMessage('')
    setShowConfirmModal(false)
    showToast(`Kampanya ${selected.length} müşteriye gönderildi`, 'success')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SMS Kampanyaları</h1>
        <p className="mt-2 text-gray-600">
          Pasif müşterilere kampanya gönderin
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inactive Customers */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Pasif Müşteriler (30+ gün)
            </h2>
            {inactiveCustomers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedCustomers.size === inactiveCustomers.length
                  ? 'Seçimi Kaldır'
                  : 'Tümünü Seç'}
              </Button>
            )}
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {inactiveCustomers.length === 0 ? (
              <EmptyState
                title="Pasif müşteri yok"
                description="Tüm müşteriler aktif görünüyor"
              />
            ) : (
              inactiveCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{customer.full_name}</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    {customer.last_visit_at && (
                      <p className="text-xs text-gray-500">
                        Son ziyaret: {new Date(customer.last_visit_at).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(customer.id)}
                    onChange={() => toggleCustomerSelection(customer.id)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            En Çok Gelen Müşteriler
          </h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {topCustomers.length === 0 ? (
              <EmptyState
                title="Henüz ziyaret yok"
                description="Müşteriler ziyaret ettikçe burada görünecek"
              />
            ) : (
              topCustomers.map((item) => (
                <div
                  key={item.customer.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.customer.full_name}</p>
                    <p className="text-sm text-gray-600">{item.customer.phone}</p>
                  </div>
                  <Badge variant="success">{item.count} ziyaret</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Campaign Composer */}
      {selectedCustomers.size > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Kampanya Mesajı ({selectedCustomers.size} seçili)
          </h2>
          <div className="space-y-4">
            <div>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Kampanya mesajınızı yazın..."
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                maxLength={160}
              />
              <p className="mt-2 text-sm text-gray-500">
                {campaignMessage.length}/160 karakter
              </p>
            </div>
            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={!campaignMessage.trim()}
              size="lg"
              className="w-full"
            >
              Kampanyayı Gönder
            </Button>
          </div>
        </Card>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowConfirmModal(false)}
          title="Kampanyayı Gönder"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              {selectedCustomers.size} müşteriye kampanya gönderilecek. Devam etmek istiyor musunuz?
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleSendCampaign}
                disabled={sending}
                className="flex-1"
              >
                {sending ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

