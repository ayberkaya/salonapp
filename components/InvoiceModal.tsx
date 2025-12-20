'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { X, Plus, Trash2, Search } from 'lucide-react'
import Card from '@/components/ui/Card'
import ServiceSelectDropdown from '@/components/ServiceSelectDropdown'

type Customer = {
  id: string
  full_name: string
  phone: string
}

type Staff = {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
}

type Service = {
  id: string
  name: string
  default_price: number
}

type ServiceRow = {
  id: string
  staff_id: string | null
  staff_name: string | null
  service_ids: string[]
  services: Array<{
    id: string
    name: string
    price: number
  }>
}

type InvoiceService = {
  id: string
  service_id: string
  service_name: string
  staff_id: string | null
  staff_name: string | null
  unit_price: number
  total_price: number
}

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  salonId: string
  profileId: string
}

export default function InvoiceModal({
  isOpen,
  onClose,
  salonId,
  profileId,
}: InvoiceModalProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Services and Staff
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  
  // Service rows (personel/hizmet seçim satırları)
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([])
  
  // Selected services (final list)
  const [invoiceServices, setInvoiceServices] = useState<InvoiceService[]>([])

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'code'>('none')
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [discountCode, setDiscountCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadServices()
      loadStaff()
      // Initialize with one empty row
      setServiceRows([{
        id: `row-${Date.now()}`,
        staff_id: null,
        staff_name: null,
        service_ids: [],
        services: []
      }])
    }
  }, [isOpen, salonId])

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers()
    } else {
      setCustomers([])
    }
  }, [customerSearch])

  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showCustomerDropdown && !target.closest('[data-customer-dropdown]')) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCustomerDropdown, isOpen])

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('name')

    if (!error && data) {
      setServices(data)
    }
  }

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('full_name')

    if (!error && data) {
      setStaffList(data)
    }
  }

  const searchCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('salon_id', salonId)
      .or(`phone.ilike.%${customerSearch}%,full_name.ilike.%${customerSearch}%`)
      .limit(10)

    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  const handleAddServiceRow = () => {
    setServiceRows([...serviceRows, {
      id: `row-${Date.now()}`,
      staff_id: null,
      staff_name: null,
      service_ids: [],
      services: []
    }])
  }

  const handleRemoveServiceRow = (rowId: string) => {
    const row = serviceRows.find(r => r.id === rowId)
    if (row) {
      // Remove services from this row from invoiceServices
      const servicesToRemove = row.services.map(s => s.id)
      setInvoiceServices(prev => prev.filter(s => !servicesToRemove.includes(s.service_id)))
    }
    setServiceRows(serviceRows.filter(r => r.id !== rowId))
  }

  const handleStaffChange = (rowId: string, staffId: string) => {
    const staff = staffList.find(s => s.id === staffId)
    setServiceRows(rows => rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          staff_id: staffId,
          staff_name: staff?.full_name || null,
          // Update services with new staff
          services: row.services.map(s => ({ ...s }))
        }
      }
      return row
    }))
    updateInvoiceServices()
  }

  const handleServiceToggle = (rowId: string, serviceId: string, checked: boolean) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    setServiceRows(rows => rows.map(row => {
      if (row.id === rowId) {
        if (checked) {
          // Add service
          return {
            ...row,
            service_ids: [...row.service_ids, serviceId],
            services: [...row.services, {
              id: serviceId,
              name: service.name,
              price: service.default_price
            }]
          }
        } else {
          // Remove service
          return {
            ...row,
            service_ids: row.service_ids.filter(id => id !== serviceId),
            services: row.services.filter(s => s.id !== serviceId)
          }
        }
      }
      return row
    }))
    
    // Update invoice services after a short delay
    setTimeout(() => updateInvoiceServices(), 100)
  }

  const updateInvoiceServices = () => {
    const allServices: InvoiceService[] = []
    const seenServices = new Set<string>()
    
    serviceRows.forEach(row => {
      if (row.staff_id && row.services.length > 0) {
        row.services.forEach(service => {
          // Create unique key to avoid duplicates
          const uniqueKey = `${row.staff_id}-${service.id}`
          if (!seenServices.has(uniqueKey)) {
            seenServices.add(uniqueKey)
            allServices.push({
              id: `${row.id}-${service.id}-${Date.now()}`,
              service_id: service.id,
              service_name: service.name,
              staff_id: row.staff_id,
              staff_name: row.staff_name,
              unit_price: service.price,
              total_price: service.price
            })
          }
        })
      }
    })
    setInvoiceServices(allServices)
  }

  useEffect(() => {
    // Use a small delay to ensure state is updated
    const timer = setTimeout(() => {
      updateInvoiceServices()
    }, 50)
    return () => clearTimeout(timer)
  }, [serviceRows])

  const handleServicePriceChange = (serviceId: string, price: number) => {
    setInvoiceServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          unit_price: price,
          total_price: price
        }
      }
      return s
    }))
  }

  const handleRemoveService = (serviceId: string) => {
    // Find the service to remove
    const serviceToRemove = invoiceServices.find(s => s.id === serviceId)
    if (!serviceToRemove) return

    // Remove from invoice services
    setInvoiceServices(prev => prev.filter(s => s.id !== serviceId))
    
    // Also remove from service rows
    setServiceRows(rows => rows.map(row => {
      // Check if this row contains the service to remove
      if (row.staff_id === serviceToRemove.staff_id) {
        return {
          ...row,
          services: row.services.filter(s => s.id !== serviceToRemove.service_id),
          service_ids: row.service_ids.filter(id => id !== serviceToRemove.service_id)
        }
      }
      return row
    }))
  }

  const calculateTotals = () => {
    const subtotal = invoiceServices.reduce((sum, item) => sum + item.total_price, 0)
    let discountAmount = 0
    
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountPercentage / 100)
    } else if (discountType === 'code') {
      // TODO: Implement discount code lookup
      discountAmount = 0
    }
    
    const total = subtotal - discountAmount
    return { subtotal, discountAmount, total }
  }

  const handleSave = async () => {
    if (!selectedCustomer) {
      showToast('Lütfen müşteri seçin', 'error')
      return
    }
    if (invoiceServices.length === 0) {
      showToast('Lütfen en az bir hizmet ekleyin', 'error')
      return
    }

    setSaving(true)
    try {
      // Generate invoice number
      const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number', {
        salon_uuid: salonId,
      })

      const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`

      const { subtotal, discountAmount, total } = calculateTotals()

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          salon_id: salonId,
          customer_id: selectedCustomer.id,
          invoice_number: invoiceNumber,
          subtotal: subtotal.toFixed(2),
          discount_percentage: discountType === 'percentage' ? discountPercentage : 0,
          discount_amount: discountAmount.toFixed(2),
          total_amount: total.toFixed(2),
          created_by: profileId,
        })
        .select()
        .single()

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError)
        showToast('Adisyon oluşturulurken hata oluştu', 'error')
        return
      }

      // Create invoice items
      const itemsToInsert = invoiceServices.map(item => ({
        invoice_id: invoice.id,
        service_name: `${item.service_name}${item.staff_name ? ` (${item.staff_name})` : ''}`,
        quantity: 1,
        unit_price: item.unit_price.toFixed(2),
        total_price: item.total_price.toFixed(2),
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Invoice items error:', itemsError)
        showToast('Adisyon kalemleri eklenirken hata oluştu', 'error')
        return
      }

      // Create invoice staff associations (unique staff IDs)
      const uniqueStaffIds = Array.from(new Set(invoiceServices.map(s => s.staff_id).filter(Boolean)))
      const staffToInsert = uniqueStaffIds.map(staffId => ({
        invoice_id: invoice.id,
        staff_id: staffId!,
      }))

      if (staffToInsert.length > 0) {
        const { error: staffError } = await supabase
          .from('invoice_staff')
          .insert(staffToInsert)

        if (staffError) {
          console.error('Invoice staff error:', staffError)
          showToast('Personel bilgileri eklenirken hata oluştu', 'error')
          return
        }
      }

      showToast('Adisyon başarıyla oluşturuldu', 'success')
      handleClose()
      router.refresh()
    } catch (err) {
      console.error('Unexpected error:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSelectedCustomer(null)
    setServiceRows([{
      id: `row-${Date.now()}`,
      staff_id: null,
      staff_name: null,
      service_ids: [],
      services: []
    }])
    setInvoiceServices([])
    setCustomerSearch('')
    setDiscountType('none')
    setDiscountPercentage(0)
    setDiscountCode('')
    setShowCustomerDropdown(false)
    onClose()
  }

  const { subtotal, discountAmount, total } = calculateTotals()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Adisyon" size="lg">
      <div className="space-y-6">
        {/* Customer Selection */}
        <div className="relative" data-customer-dropdown>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Müşteri</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Müşteri ara (isim veya telefon)..."
              value={selectedCustomer ? selectedCustomer.full_name : customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
                if (selectedCustomer) {
                  setSelectedCustomer(null)
                }
              }}
              onFocus={() => {
                if (customerSearch.length >= 2) {
                  setShowCustomerDropdown(true)
                }
              }}
              className="pl-10 text-black"
            />
            {selectedCustomer && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedCustomer(null)
                    setCustomerSearch('')
                    setShowCustomerDropdown(false)
                  }}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {showCustomerDropdown && !selectedCustomer && (customerSearch.length >= 2 || customers.length > 0) && (
            <div className="absolute z-[100] mt-1 w-full rounded-lg border-2 border-blue-200 bg-white shadow-xl max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Aranıyor...</div>
              ) : customers.length > 0 ? (
                <div>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('Customer selected:', customer)
                        setSelectedCustomer(customer)
                        setCustomerSearch('')
                        setShowCustomerDropdown(false)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      className="w-full p-4 text-left transition-colors hover:bg-blue-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                    >
                      <p className="font-medium text-gray-900">{customer.full_name}</p>
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              ) : customerSearch.length >= 2 ? (
                <div className="p-4 text-center text-gray-500">Müşteri bulunamadı</div>
              ) : null}
            </div>
          )}

          {selectedCustomer && (
            <Card className="mt-2 p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Service Rows */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">Personel ve Hizmetler</label>
          {serviceRows.map((row, index) => (
            <div key={row.id} className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-1 grid grid-cols-2 gap-3">
                {/* Staff Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Personel</label>
                  <select
                    value={row.staff_id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleStaffChange(row.id, e.target.value)
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Personel Seçin</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Services Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hizmetler</label>
                  <ServiceSelectDropdown
                    services={services}
                    selectedServiceIds={row.service_ids}
                    onSelectionChange={(serviceIds) => {
                      // Update the row with new service selections
                      setServiceRows(rows => rows.map(r => {
                        if (r.id === row.id) {
                          // Find services to add and remove
                          const servicesToAdd = serviceIds.filter(id => !r.service_ids.includes(id))
                          const servicesToRemove = r.service_ids.filter(id => !serviceIds.includes(id))
                          
                          // Get service details for new services
                          const newServices = servicesToAdd.map(serviceId => {
                            const service = services.find(s => s.id === serviceId)
                            return service ? {
                              id: serviceId,
                              name: service.name,
                              price: service.default_price
                            } : null
                          }).filter(Boolean) as Array<{ id: string; name: string; price: number }>
                          
                          return {
                            ...r,
                            service_ids: serviceIds,
                            services: [
                              ...r.services.filter(s => !servicesToRemove.includes(s.id)),
                              ...newServices
                            ]
                          }
                        }
                        return r
                      }))
                    }}
                    placeholder="Hizmet seçin"
                  />
                </div>
              </div>
              {serviceRows.length > 1 && (
                <button
                  onClick={() => handleRemoveServiceRow(row.id)}
                  className="mt-6 rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          
          <Button
            onClick={handleAddServiceRow}
            variant="ghost"
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 h-9 text-sm"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Bir hizmet daha ekle
          </Button>
        </div>

        {/* Selected Services List */}
        {invoiceServices.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Seçilen Hizmetler</label>
            <div className="rounded-lg border-2 border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-1 text-left text-xs font-semibold text-gray-700">Hizmet</th>
                    <th className="px-4 py-1 text-left text-xs font-semibold text-gray-700">Personel</th>
                    <th className="px-4 py-1 text-right text-xs font-semibold text-gray-700">Tutar</th>
                    <th className="px-4 py-1 text-center text-xs font-semibold text-gray-700">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-4 py-1 text-sm font-medium text-gray-900">
                        {service.service_name}
                      </td>
                      <td className="px-4 py-1 text-sm text-gray-600">
                        {service.staff_name || '-'}
                      </td>
                      <td className="px-4 py-1 text-right">
                        <Input
                          type="number"
                          value={service.unit_price}
                          onChange={(e) =>
                            handleServicePriceChange(service.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-32 text-right font-semibold text-sm"
                          step="0.01"
                          min="0"
                        />
                        <span className="ml-2 text-xs text-gray-600">₺</span>
                      </td>
                      <td className="px-4 py-1 text-center">
                        <button
                          onClick={() => handleRemoveService(service.id)}
                          className="rounded-lg p-1 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Discount Section */}
        <div className="space-y-3 pt-4 border-t-2 border-gray-200">
          <label className="block text-sm font-semibold text-gray-900">İndirim</label>
          <div className="flex gap-3">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">İndirim Yok</option>
              <option value="percentage">İndirim Yüzdesi</option>
              <option value="code">İndirim Kodu</option>
            </select>
            
            {discountType === 'percentage' && (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) =>
                    setDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                  className="w-24"
                  placeholder="%"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-600">İndirim: {discountAmount.toFixed(2)} ₺</span>
              </div>
            )}
            
            {discountType === 'code' && (
              <Input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1"
                placeholder="İndirim kodu girin"
              />
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 pt-4 border-t-2 border-gray-200">
          <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-700 font-medium text-sm">Ara Toplam:</span>
            <span className="font-semibold text-gray-900 text-base">{subtotal.toFixed(2)} ₺</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg">
              <span className="text-gray-700 font-medium text-sm">İndirim:</span>
              <span className="font-semibold text-red-600 text-base">-{discountAmount.toFixed(2)} ₺</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300 bg-blue-50 p-3 rounded-lg">
            <span className="text-lg font-bold text-gray-900">Toplam:</span>
            <span className="text-2xl font-bold text-blue-600">{total.toFixed(2)} ₺</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1 h-9 text-sm"
            disabled={saving}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedCustomer || invoiceServices.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 h-9 text-sm"
          >
            {saving ? 'Kaydediliyor...' : 'Adisyonu Kaydet'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
