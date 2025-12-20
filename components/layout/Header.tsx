'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { Users, Mail, Receipt, Scissors, Calendar, Menu, X } from 'lucide-react'
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
  { label: 'Randevular', href: '/appointments', icon: Calendar, roles: ['OWNER', 'STAFF'] },
  { label: 'Kampanyalar', href: '/campaigns', icon: Mail, roles: ['OWNER'] },
]

export default function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  )

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center gap-4">
            <Link href="/home" className="cursor-pointer">
              <h1 className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">Kuaför CRM</h1>
            </Link>
            
            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center gap-1">
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

          {/* Mobile Menu Button and User Menu */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* User Menu */}
            <UserMenu profile={profile} />
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <nav className="flex flex-col py-2">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'cursor-pointer flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
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
        )}
      </div>
    </header>
  )
}

