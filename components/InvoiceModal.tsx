'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { X, Plus, Trash2, Users, Search, Minus } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

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

type InvoiceItem = {
  service_id: string
  service_name: string
  quantity: number
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

  const [step, setStep] = useState<'customer' | 'services' | 'staff' | 'review'>('customer')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Services
  const [services, setServices] = useState<Service[]>([])
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])

  // Staff
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())

  // Discount
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [discountCode, setDiscountCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadServices()
      loadStaff()
    }
  }, [isOpen, salonId])

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers()
    } else {
      setCustomers([])
    }
  }, [customerSearch])

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

  const handleAddService = (service: Service) => {
    const existingItem = invoiceItems.find(item => item.service_id === service.id)
    if (existingItem) {
      // Increase quantity
      setInvoiceItems(items =>
        items.map(item =>
          item.service_id === service.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        )
      )
    } else {
      // Add new item
      setInvoiceItems(items => [
        ...items,
        {
          service_id: service.id,
          service_name: service.name,
          quantity: 1,
          unit_price: service.default_price,
          total_price: service.default_price,
        },
      ])
    }
  }

  const handleRemoveService = (serviceId: string) => {
    setInvoiceItems(items => items.filter(item => item.service_id !== serviceId))
  }

  const handleUpdateQuantity = (serviceId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveService(serviceId)
      return
    }
    setInvoiceItems(items =>
      items.map(item =>
        item.service_id === serviceId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.unit_price,
            }
          : item
      )
    )
  }

  const handleUpdatePrice = (serviceId: string, price: number) => {
    setInvoiceItems(items =>
      items.map(item =>
        item.service_id === serviceId
          ? {
              ...item,
              unit_price: price,
              total_price: item.quantity * price,
            }
          : item
      )
    )
  }

  const handleToggleStaff = (staffId: string) => {
    setSelectedStaff(prev => {
      const newSet = new Set(prev)
      if (newSet.has(staffId)) {
        newSet.delete(staffId)
      } else {
        newSet.add(staffId)
      }
      return newSet
    })
  }

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total_price, 0)
    const discountAmount = subtotal * (discountPercentage / 100)
    const total = subtotal - discountAmount
    return { subtotal, discountAmount, total }
  }

  const handleSave = async () => {
    if (!selectedCustomer) {
      showToast('Lütfen müşteri seçin', 'error')
      return
    }
    if (invoiceItems.length === 0) {
      showToast('Lütfen en az bir hizmet ekleyin', 'error')
      return
    }
    if (selectedStaff.size === 0) {
      showToast('Lütfen en az bir personel seçin', 'error')
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
          discount_percentage: discountPercentage,
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
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        service_name: item.service_name,
        quantity: item.quantity,
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

      // Create invoice staff associations
      const staffToInsert = Array.from(selectedStaff).map(staffId => ({
        invoice_id: invoice.id,
        staff_id: staffId,
      }))

      const { error: staffError } = await supabase
        .from('invoice_staff')
        .insert(staffToInsert)

      if (staffError) {
        console.error('Invoice staff error:', staffError)
        showToast('Personel bilgileri eklenirken hata oluştu', 'error')
        return
      }

      showToast('Adisyon başarıyla oluşturuldu', 'success')
      onClose()
      router.refresh()
    } catch (err) {
      console.error('Unexpected error:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setStep('customer')
    setSelectedCustomer(null)
    setInvoiceItems([])
    setSelectedStaff(new Set())
    setDiscountPercentage(0)
    setDiscountCode('')
    setCustomerSearch('')
    onClose()
  }

  const { subtotal, discountAmount, total } = calculateTotals()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Adisyon" size="lg">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          {['Müşteri', 'Hizmetler', 'Personel', 'Özet'].map((stepName, index) => {
            const stepKeys: ('customer' | 'services' | 'staff' | 'review')[] = [
              'customer',
              'services',
              'staff',
              'review',
            ]
            const currentStepIndex = stepKeys.indexOf(step)
            const isActive = index === currentStepIndex
            const isCompleted = index < currentStepIndex
            return (
              <div key={stepName} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-110'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {stepName}
                  </p>
                </div>
                {index < 3 && (
                  <div
                    className={`h-1 flex-1 mx-3 rounded-full transition-all ${
                      isCompleted ? 'bg-green-500' : index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1: Customer Selection */}
        {step === 'customer' && (
          <div className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Müşteri ara (isim veya telefon)..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10 text-black"
                autoFocus
              />
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-500">Aranıyor...</div>
            ) : customers.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setStep('services')
                    }}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                  >
                    <p className="font-medium text-gray-900">{customer.full_name}</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                  </button>
                ))}
              </div>
            ) : customerSearch.length >= 2 ? (
              <div className="py-8 text-center text-gray-500">
                Müşteri bulunamadı
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                Müşteri aramak için en az 2 karakter girin
              </div>
            )}

            {selectedCustomer && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedCustomer.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Services */}
        {step === 'services' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hizmetler</h3>
              <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleAddService(service)}
                    className="rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                  >
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">{service.default_price.toFixed(2)} ₺</p>
                  </button>
                ))}
              </div>
            </div>

            {invoiceItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Seçilen Hizmetler</h3>
                <div className="max-h-72 overflow-y-auto space-y-3 p-2">
                {invoiceItems.map((item) => (
                  <Card key={item.service_id} className="p-4 border-2 border-blue-100 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">{item.service_name}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateQuantity(item.service_id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateQuantity(item.service_id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUpdatePrice(item.service_id, parseFloat(e.target.value) || 0)
                            }
                            className="w-28 ml-4 text-base font-medium"
                            step="0.01"
                            min="0"
                          />
                          <span className="text-gray-600 ml-2 font-medium">₺</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-blue-600">
                          {item.total_price.toFixed(2)} ₺
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveService(item.service_id)}
                          className="mt-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-semibold text-gray-900">Ara Toplam:</span>
              <span className="text-xl font-bold text-gray-900">
                {subtotal.toFixed(2)} ₺
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Staff */}
        {step === 'staff' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Personel Seçimi</h3>
            <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => handleToggleStaff(staff.id)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selectedStaff.has(staff.id)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{staff.full_name}</p>
                      {staff.phone && (
                        <p className="text-sm text-gray-600 mt-1">{staff.phone}</p>
                      )}
                    </div>
                    {selectedStaff.has(staff.id) && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white ml-3 flex-shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {staffList.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                Henüz personel eklenmemiş. Önce personel ekleyin.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Müşteri</h3>
              <p className="text-gray-900">{selectedCustomer?.full_name}</p>
              <p className="text-sm text-gray-600">{selectedCustomer?.phone}</p>
            </Card>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Hizmetler</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {invoiceItems.map((item) => (
                  <div
                    key={item.service_id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.service_name} x {item.quantity}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.unit_price.toFixed(2)} ₺ / adet
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">{item.total_price.toFixed(2)} ₺</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Personel</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedStaff).map((staffId) => {
                  const staff = staffList.find(s => s.id === staffId)
                  return staff ? (
                    <Badge key={staffId} variant="default">
                      {staff.full_name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-700 font-medium">Ara Toplam:</span>
                <span className="font-semibold text-gray-900 text-lg">{subtotal.toFixed(2)} ₺</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) =>
                    setDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                  className="w-28 font-medium"
                  placeholder="%"
                  min="0"
                  max="100"
                />
                <span className="text-gray-700 font-medium">İndirim:</span>
                <span className="font-semibold text-red-600 text-lg">
                  -{discountAmount.toFixed(2)} ₺
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 bg-blue-50 p-4 rounded-lg">
                <span className="text-xl font-bold text-gray-900">Toplam:</span>
                <span className="text-3xl font-bold text-blue-600">{total.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          {step !== 'customer' && (
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 'services') setStep('customer')
                if (step === 'staff') setStep('services')
                if (step === 'review') setStep('staff')
              }}
              className="flex-1"
            >
              Geri
            </Button>
          )}
          {step === 'customer' && selectedCustomer && (
            <Button onClick={() => setStep('services')} className="flex-1">
              Devam Et
            </Button>
          )}
          {step === 'services' && invoiceItems.length > 0 && (
            <Button onClick={() => setStep('staff')} className="flex-1">
              Devam Et
            </Button>
          )}
          {step === 'staff' && selectedStaff.size > 0 && (
            <Button onClick={() => setStep('review')} className="flex-1">
              Devam Et
            </Button>
          )}
          {step === 'review' && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {saving ? 'Kaydediliyor...' : 'Adisyonu Kaydet'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

