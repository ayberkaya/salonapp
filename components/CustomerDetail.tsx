'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'

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
      const checkinUrl = `${window.location.origin}/checkin?token=${tokenValue}`
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Geri"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{customer.full_name}</h1>
          <p className="mt-1 text-lg text-gray-600">{customer.phone}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-600">Toplam Ziyaret</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visitCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-600">Son Ziyaret</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{lastVisitDate}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-600">Durum</p>
          <div className="mt-1">
            {customer.last_visit_at ? (
              <Badge variant="success">Aktif</Badge>
            ) : (
              <Badge variant="warning">Yeni</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Primary CTA */}
      <Card className="p-6">
        <Button
          onClick={handleStartVisit}
          size="lg"
          className="w-full"
        >
          Ziyaret Başlat
        </Button>
      </Card>

      {/* Visit History */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Ziyaret Geçmişi</h2>
        {visits.length > 0 ? (
          <div className="space-y-2">
            {visits.map((visit) => (
              <Card key={visit.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(visit.visited_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {visit.profiles && (
                      <p className="mt-1 text-sm text-gray-600">
                        Kaydeden: {visit.profiles.full_name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
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

  useEffect(() => {
    if (!expiresAt) return

    // Initialize time remaining
    setTimeRemaining(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeRemaining(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <Modal isOpen={true} onClose={onClose} size="lg" title={`Ziyaret: ${customerName}`}>
      <div className="flex flex-col items-center space-y-6">
        <div className="rounded-lg border-4 border-blue-500 p-4 bg-white">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
            alt="QR Code"
            className="h-64 w-64"
          />
        </div>
        
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Kalan süre: {timeRemaining}s
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Müşteri bu QR kodu tarayarak ziyareti onaylamalı
          </p>
        </div>

        {timeRemaining === 0 && (
          <Button onClick={onRegenerate} className="w-full">
            Yeni QR Kod Oluştur
          </Button>
        )}

        <Button variant="ghost" onClick={onClose} className="w-full">
          Kapat
        </Button>
      </div>
    </Modal>
  )
}


