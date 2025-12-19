import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/layout/Nav'
import CustomersList from '@/components/CustomersList'

export default async function CustomersPage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Get all customers
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', profile.salon_id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav profile={profile} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CustomersList customers={customers || []} profile={profile} />
      </div>
    </div>
  )
}

