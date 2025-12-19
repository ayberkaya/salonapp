import { redirect } from 'next/navigation'
import { getCurrentProfile, requireOwner } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import Nav from '@/components/layout/Nav'
import CampaignsView from '@/components/CampaignsView'

type Customer = Database['public']['Tables']['customers']['Row']

export default async function CampaignsPage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  // Only owners can access
  try {
    await requireOwner()
  } catch {
    redirect('/home')
  }

  const supabase = await createClient()

  // Get inactive customers (30+ days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: inactiveCustomers } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', profile.salon_id)
    .or(`last_visit_at.is.null,last_visit_at.lt.${thirtyDaysAgo.toISOString()}`)
    .order('last_visit_at', { ascending: true, nullsFirst: true })

  // Get top customers
  const { data: visits } = await supabase
    .from('visits')
    .select('customer_id, customers(*)')
    .eq('salon_id', profile.salon_id)

  const visitCounts = new Map<string, { customer: Customer; count: number }>()
  visits?.forEach((visit) => {
    const customerId = visit.customer_id
    const customer = Array.isArray(visit.customers) 
      ? (visit.customers[0] as unknown as Customer)
      : (visit.customers as unknown as Customer)
    if (customer && visitCounts.has(customerId)) {
      visitCounts.get(customerId)!.count++
    } else if (customer) {
      visitCounts.set(customerId, { customer, count: 1 })
    }
  })

  const topCustomers = Array.from(visitCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav profile={profile} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CampaignsView
          profile={profile}
          inactiveCustomers={inactiveCustomers || []}
          topCustomers={topCustomers}
        />
      </div>
    </div>
  )
}

