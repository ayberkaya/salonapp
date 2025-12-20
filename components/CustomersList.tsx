'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import { Database } from '@/types/database'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Trash2 } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

export default function CustomersList({
  customers: initialCustomers,
  profile,
}: {
  customers: Customer[]
  profile: Profile
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState(initialCustomers)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      customer.full_name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    )
  })

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`"${customerName}" müşterisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    setDeletingId(customerId)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('salon_id', profile.salon_id)

      if (error) {
        console.error('Error deleting customer:', error)
        showToast('Müşteri silinirken hata oluştu', 'error')
        return
      }

      setCustomers(customers.filter(c => c.id !== customerId))
      showToast('Müşteri başarıyla silindi', 'success')
    } catch (err) {
      console.error('Error deleting customer:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="mt-2 text-gray-600">
            {searchQuery ? `${filteredCustomers.length} müşteri bulundu` : `Toplam ${customers.length} müşteri`}
          </p>
        </div>
      </div>

      {customers.length > 0 && (
        <div>
          <input
            type="text"
            placeholder="İsim veya telefon ile ara..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

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
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="Müşteri bulunamadı"
            description={`"${searchQuery}" için sonuç bulunamadı`}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteCustomer(customer.id, customer.full_name || '')
                    }}
                    disabled={deletingId === customer.id}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Müşteriyi sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <svg
                    className="h-5 w-5 text-gray-400 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    onClick={() => router.push(`/customers/${customer.id}`)}
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

