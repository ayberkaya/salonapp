'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { Home, Users, Mail, LogOut, User } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

type Profile = Database['public']['Tables']['profiles']['Row']

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('OWNER' | 'STAFF')[]
}

const navItems: NavItem[] = [
  { label: 'Ana Sayfa', href: '/home', icon: Home, roles: ['OWNER', 'STAFF'] },
  { label: 'Müşteriler', href: '/customers', icon: Users, roles: ['OWNER', 'STAFF'] },
  { label: 'Kampanyalar', href: '/campaigns', icon: Mail, roles: ['OWNER'] },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  )

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <h1 className="text-xl font-bold text-gray-900">Kuaför CRM</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-400')} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{profile.role === 'OWNER' ? 'Sahip' : 'Personel'}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

