import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import Header from '@/components/layout/Header'
import StaffManagement from '@/components/StaffManagement'
import { Users } from 'lucide-react'

export default async function StaffPage() {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  // Only owners can access staff management
  if (profile.role !== 'OWNER') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personel Yönetimi</h1>
              <p className="mt-1 text-gray-600">Salon personellerini ekleyin ve yönetin</p>
            </div>
          </div>
        </div>
        <StaffManagement salonId={profile.salon_id} profileId={profile.id} />
      </div>
    </div>
  )
}

