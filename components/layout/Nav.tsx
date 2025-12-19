'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'

type Profile = Database['public']['Tables']['profiles']['Row']

interface NavItem {
  label: string
  href: string
  icon: string
  roles?: ('OWNER' | 'STAFF')[]
}

const navItems: NavItem[] = [
  { label: 'Ana Sayfa', href: '/home', icon: '🏠', roles: ['OWNER', 'STAFF'] },
  { label: 'Müşteriler', href: '/customers', icon: '👥', roles: ['OWNER', 'STAFF'] },
  { label: 'Kampanyalar', href: '/campaigns', icon: '📧', roles: ['OWNER'] },
]

export default function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  )

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}

