'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

type Service = {
  id: string
  name: string
  default_price: number
}

interface ServiceSelectDropdownProps {
  services: Service[]
  selectedServiceIds: string[]
  onSelectionChange: (serviceIds: string[]) => void
  placeholder?: string
}

export default function ServiceSelectDropdown({
  services,
  selectedServiceIds,
  onSelectionChange,
  placeholder = 'Hizmet seçin',
}: ServiceSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))

  const handleToggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      onSelectionChange(selectedServiceIds.filter(id => id !== serviceId))
    } else {
      onSelectionChange([...selectedServiceIds, serviceId])
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className={selectedServices.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
          {selectedServices.length > 0
            ? `${selectedServices.length} hizmet seçildi`
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Hizmet ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Services List */}
          <div className="overflow-y-auto max-h-64">
            {filteredServices.length > 0 ? (
              <div className="p-2">
                {filteredServices.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id)
                  return (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ padding: '8px 12px', height: '44px' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleService(service.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900" style={{ fontSize: '13px' }}>{service.name}</p>
                        <p className="text-xs text-gray-600" style={{ fontSize: '11px' }}>{service.default_price.toFixed(2)} ₺</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery ? 'Hizmet bulunamadı' : 'Hizmet bulunamadı'}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false)
                setSearchQuery('')
              }}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Selected Services Badges */}
      {selectedServices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedServices.map((service) => (
            <span
              key={service.id}
              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
            >
              {service.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

