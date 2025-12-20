'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { LogOut, Settings, User, ChevronDown, Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function UserMenu({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-gray-500">{profile.role === 'OWNER' ? 'Sahip' : 'Personel'}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
              <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{profile.role === 'OWNER' ? 'Sahip' : 'Personel'}</p>
            </div>
            
            <Link
              href="/services"
              onClick={() => setIsOpen(false)}
              className="cursor-pointer flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Scissors className="h-4 w-4 text-gray-400" />
              <span>Hizmetler</span>
            </Link>
            
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="cursor-pointer flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              <span>Ayarlar</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="cursor-pointer flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

