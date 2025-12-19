'use client'

import { useRouter } from 'next/navigation'
import { Database } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

export default function CustomersList({
  customers,
  profile,
}: {
  customers: Customer[]
  profile: Profile
}) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="mt-2 text-gray-600">
            Toplam {customers.length} müşteri
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="Henüz müşteri yok"
            description="İlk müşteriyi eklemek için ana sayfaya gidin"
            action={
              <button
                onClick={() => router.push('/home')}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Ana Sayfaya Git
              </button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer p-4 transition-all hover:shadow-md"
              onClick={() => router.push(`/customers/${customer.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{customer.phone}</p>
                  {customer.last_visit_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      Son ziyaret: {new Date(customer.last_visit_at).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {customer.last_visit_at ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="warning">Yeni</Badge>
                  )}
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

