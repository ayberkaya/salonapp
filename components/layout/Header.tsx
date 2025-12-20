'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { Users, Mail, Receipt, Scissors } from 'lucide-react'
import UserMenu from './UserMenu'

type Profile = Database['public']['Tables']['profiles']['Row']

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('OWNER' | 'STAFF')[]
}

const navItems: NavItem[] = [
  { label: 'Müşteriler', href: '/customers', icon: Users, roles: ['OWNER', 'STAFF'] },
  { label: 'Adisyonlar', href: '/invoices', icon: Receipt, roles: ['OWNER', 'STAFF'] },
  { label: 'Kampanyalar', href: '/campaigns', icon: Mail, roles: ['OWNER'] },
]

export default function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  )

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-4">
            <Link href="/home" className="cursor-pointer">
              <h1 className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">Kuaför CRM</h1>
            </Link>
            
            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'cursor-pointer flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-400')} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Menu */}
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  )
}

