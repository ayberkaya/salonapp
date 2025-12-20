'use client'

import { useMemo } from 'react'
import { getAppUrl } from '@/lib/utils'
import Card from '@/components/ui/Card'
import { QrCode, Download } from 'lucide-react'
import Button from '@/components/ui/Button'

interface StaticRegistrationQRProps {
  salonId: string
}

export default function StaticRegistrationQR({ salonId }: StaticRegistrationQRProps) {
  const registrationUrl = useMemo(() => {
    const baseUrl = getAppUrl()
    return `${baseUrl}/register?salon_id=${salonId}`
  }, [salonId])

  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(registrationUrl)}&margin=1`
  }, [registrationUrl])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = 'musteri-kayit-qr.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <QrCode className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Müşteri Kayıt QR Kodu</h3>
          <p className="text-sm text-gray-600">
            Bu QR kodu müşterilerinize gösterin, kendi kayıtlarını yapsınlar
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex-shrink-0">
          <div className="rounded-lg border-4 border-blue-500 bg-white p-4">
            <img
              src={qrCodeUrl}
              alt="Müşteri Kayıt QR Kodu"
              className="h-64 w-64"
            />
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Kayıt Linki
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={registrationUrl}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(registrationUrl)
                }}
              >
                Kopyala
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              QR Kodu İndir
            </Button>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Not:</strong> Bu QR kodu statiktir ve süresi dolmaz. Müşteriler bu QR kodu okutarak 
              kendi kayıtlarını yapabilir ve %15 hoş geldin indirimi kazanırlar.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

