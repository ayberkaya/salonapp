import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import CustomerSearch from '@/components/CustomerSearch'
import OwnerDashboard from '@/components/OwnerDashboard'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage() {
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

  if (profile.role === 'OWNER') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {salon?.name || 'Salon Dashboard'}
              </h1>
              <p className="mt-2 text-gray-600">
                Welcome, {profile.full_name}
              </p>
            </div>
            <LogoutButton />
          </div>
          <OwnerDashboard profile={profile} salon={salon} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {salon?.name || 'Salon Dashboard'}
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome, {profile.full_name}
            </p>
          </div>
          <LogoutButton />
        </div>
        <CustomerSearch profile={profile} />
      </div>
    </div>
  )
}

