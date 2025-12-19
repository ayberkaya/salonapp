'use client'

// This component is kept for backward compatibility but now uses Header
import Header from './Header'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function Nav({ profile }: { profile: Profile }) {
  return <Header profile={profile} />
}

