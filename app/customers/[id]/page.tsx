import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/layout/Nav'
import CustomerDetail from '@/components/CustomerDetail'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  const { id } = await params
  const supabase = await createClient()

  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('salon_id', profile.salon_id)
    .single()

  if (customerError || !customer) {
    redirect('/customers')
  }

  // Get visit history
  const { data: visits } = await supabase
    .from('visits')
    .select('*, profiles(full_name)')
    .eq('customer_id', id)
    .eq('salon_id', profile.salon_id)
    .order('visited_at', { ascending: false })
    .limit(50)

  // Get visit count
  const { count: visitCount } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('salon_id', profile.salon_id)

  // Get invoices for this customer
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items (
        service_name,
        quantity,
        unit_price,
        total_price
      ),
      invoice_staff (
        staff (full_name)
      )
    `)
    .eq('customer_id', id)
    .eq('salon_id', profile.salon_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav profile={profile} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <CustomerDetail
          customer={customer}
          visits={visits || []}
          visitCount={visitCount || 0}
          profile={profile}
          invoices={invoices || []}
        />
      </div>
    </div>
  )
}

