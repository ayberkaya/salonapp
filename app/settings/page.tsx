import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Settings as SettingsIcon } from 'lucide-react'
import Card from '@/components/ui/Card'
import StaticRegistrationQR from '@/components/StaticRegistrationQR'
import SalonSettings from '@/components/SalonSettings'

export default async function SettingsPage() {
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
          <Card style={{ padding: '16.8px' }}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Hesap Bilgileri</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Ad Soyad</label>
                <p className="mt-0.5 text-sm text-gray-900">{profile.full_name}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Rol</label>
                <p className="mt-0.5 text-sm text-gray-900">{profile.role === 'OWNER' ? 'Sahip' : 'Personel'}</p>
              </div>
            </div>
          </Card>

          {profile.role === 'OWNER' && (
            <StaticRegistrationQR salonId={profile.salon_id} />
          )}

          <SalonSettings salonId={profile.salon_id} initialSalon={salon} />
        </div>
      </div>
    </div>
  )
}

