import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/layout/Nav'
import HomeSearch from '@/components/HomeSearch'

export default async function HomePage() {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('id', profile.salon_id)
    .single()

  // Get today's visit count
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: todayVisits } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', profile.salon_id)
    .gte('visited_at', today.toISOString())

  // Get recent customers (last 10)
  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', profile.salon_id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav profile={profile} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HomeSearch
          profile={profile}
          todayVisits={todayVisits || 0}
          recentCustomers={recentCustomers || []}
        />
      </div>
    </div>
  )
}

