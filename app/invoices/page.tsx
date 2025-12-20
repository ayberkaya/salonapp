import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import Header from '@/components/layout/Header'
import InvoicesList from '@/components/InvoicesList'

export default async function InvoicesPage() {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InvoicesList profile={profile} />
      </div>
    </div>
  )
}

