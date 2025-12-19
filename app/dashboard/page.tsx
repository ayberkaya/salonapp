import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    redirect('/login')
  }

  // Redirect to new home page
  redirect('/home')
}

