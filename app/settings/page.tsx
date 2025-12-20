import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import Header from '@/components/layout/Header'
import { Settings as SettingsIcon } from 'lucide-react'
import Card from '@/components/ui/Card'
import StaticRegistrationQR from '@/components/StaticRegistrationQR'
import StaffManagement from '@/components/StaffManagement'

export default async function SettingsPage() {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
              <p className="mt-1 text-gray-600">Hesap ve salon ayarlarını yönetin</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Hesap Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                <p className="mt-1 text-gray-900">{profile.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <p className="mt-1 text-gray-900">{profile.role === 'OWNER' ? 'Sahip' : 'Personel'}</p>
              </div>
            </div>
          </Card>

          {profile.role === 'OWNER' && (
            <>
              <StaticRegistrationQR salonId={profile.salon_id} />
              <StaffManagement salonId={profile.salon_id} profileId={profile.id} />
            </>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Salon Ayarları</h2>
            <p className="text-gray-600">Salon ayarları yakında eklenecek.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

