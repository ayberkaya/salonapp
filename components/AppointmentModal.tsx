'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { X, Save, Search, User, Calendar, Clock, Scissors, Plus, Trash2 } from 'lucide-react'
import ServiceSelectDropdown from '@/components/ServiceSelectDropdown'

type Customer = {
  id: string
  full_name: string
  phone: string
}

type Staff = {
  id: string
  full_name: string
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

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  salonId: string
  profileId: string
  appointment?: {
    id: string
    customer_id: string
    staff_id: string | null
    service_id: string | null
    appointment_date: string
    duration_minutes: number
    status: string
    notes: string | null
    customers?: { full_name: string; phone: string }
    staff?: { full_name: string } | null
    services?: { name: string } | null
  } | null
}

export default function AppointmentModal({
  isOpen,
  onClose,
  salonId,
  profileId,
  appointment,
}: AppointmentModalProps) {
  const supabase = createClient()
  const { showToast } = useToast()

  const [saving, setSaving] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([])
  const [formData, setFormData] = useState({
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 60,
    notes: '',
    status: 'PENDING' as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  })

  useEffect(() => {
    if (isOpen) {
      loadStaff()
      loadServices()
      
      if (appointment) {
        // Editing existing appointment
        if (appointment.customers) {
          setSelectedCustomer({
            id: appointment.customer_id || '',
            full_name: appointment.customers.full_name,
            phone: appointment.customers.phone,
          })
          setCustomerSearch(appointment.customers.full_name)
        }
        setFormData({
          appointment_date: new Date(appointment.appointment_date).toISOString().split('T')[0],
          appointment_time: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
          duration_minutes: appointment.duration_minutes || 60,
          notes: appointment.notes || '',
          status: appointment.status as any,
        })
        
        // Load existing staff and services for editing
        if (appointment.id) {
          const loadExistingData = async () => {
            const { data: appointmentStaff } = await supabase
              .from('appointment_staff')
              .select('staff_id, staff (full_name)')
              .eq('appointment_id', appointment.id)
            
            const { data: appointmentServices } = await supabase
              .from('appointment_services')
              .select('service_id, services (name, default_price)')
              .eq('appointment_id', appointment.id)
            
            // Group by staff
            const staffMap = new Map<string, { staff_id: string; staff_name: string; service_ids: string[]; services: Array<{ id: string; name: string; price: number }> }>()
            
            if (appointmentStaff && appointmentServices) {
              appointmentStaff.forEach((as: any) => {
                const staffId = as.staff_id
                if (!staffMap.has(staffId)) {
                  staffMap.set(staffId, {
                    staff_id: staffId,
                    staff_name: as.staff?.full_name || '',
                    service_ids: [],
                    services: []
                  })
                }
              })
              
              appointmentServices.forEach((as: any) => {
                const serviceId = as.service_id
                const service = as.services
                if (service) {
                  // Add to first staff or create a row without staff
                  if (staffMap.size > 0) {
                    const firstStaff = Array.from(staffMap.values())[0]
                    firstStaff.service_ids.push(serviceId)
                    firstStaff.services.push({
                      id: serviceId,
                      name: service.name,
                      price: service.default_price
                    })
                  } else {
                    // No staff, create a row without staff
                    staffMap.set('no-staff', {
                      staff_id: '',
                      staff_name: '',
                      service_ids: [serviceId],
                      services: [{
                        id: serviceId,
                        name: service.name,
                        price: service.default_price
                      }]
                    })
                  }
                }
              })
            }
            
            const rows: ServiceRow[] = Array.from(staffMap.values()).map((staff, index) => ({
              id: `row-${Date.now()}-${index}`,
              staff_id: staff.staff_id || null,
              staff_name: staff.staff_name || null,
              service_ids: staff.service_ids,
              services: staff.services
            }))
            
            if (rows.length === 0) {
              rows.push({
                id: `row-${Date.now()}`,
                staff_id: null,
                staff_name: null,
                service_ids: [],
                services: []
              })
            }
            
            setServiceRows(rows)
          }
          loadExistingData()
        }
      } else {
        // Creating new appointment
        resetForm()
      }
    }
  }, [isOpen, appointment])

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers()
    } else {
      setCustomers([])
    }
  }, [customerSearch])

  const resetForm = () => {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setServiceRows([{
      id: `row-${Date.now()}`,
      staff_id: null,
      staff_name: null,
      service_ids: [],
      services: []
    }])
    setFormData({
      appointment_date: '',
      appointment_time: '',
      duration_minutes: 60,
      notes: '',
      status: 'PENDING',
    })
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
        }
      }
      return row
    }))
  }

  const loadStaff = async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, full_name, is_active')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('full_name')

    if (data) {
      setStaffList(data)
    }
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, default_price')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('name')

    if (data) {
      setServices(data)
    }
  }

  const searchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('salon_id', salonId)
      .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
      .limit(10)

    if (error) {
      console.error('Error searching customers:', error)
    } else {
      setCustomers(data || [])
      setShowCustomerDropdown(data && data.length > 0)
    }
  }

  const handleCreateCustomer = async (name: string, phone: string) => {
    const capitalizeWords = (str: string) => {
      return str
        .toLowerCase()
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        salon_id: salonId,
        full_name: capitalizeWords(name),
        phone: phone.length === 10 ? `+90${phone}` : phone,
        kvkk_consent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        showToast('Bu telefon numarası ile kayıtlı bir müşteri zaten mevcut', 'error')
      } else {
        showToast('Müşteri oluşturulurken hata oluştu', 'error')
        console.error('Create customer error:', error)
      }
      return
    }

    if (data) {
      setSelectedCustomer({
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
      })
      setCustomerSearch(data.full_name)
      setShowCreateCustomerModal(false)
      showToast('Müşteri başarıyla oluşturuldu', 'success')
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.full_name)
    setShowCustomerDropdown(false)
  }

  const handleSave = async () => {
    if (!selectedCustomer) {
      showToast('Lütfen bir müşteri seçin', 'error')
      return
    }

    if (!formData.appointment_date || !formData.appointment_time) {
      showToast('Lütfen randevu tarihi ve saati seçin', 'error')
      return
    }

    setSaving(true)
    try {
      // Combine date and time
      const appointmentDateTime = new Date(
        `${formData.appointment_date}T${formData.appointment_time}`
      ).toISOString()

      // Collect unique staff and service IDs from service rows
      const uniqueStaffIds = Array.from(new Set(
        serviceRows
          .map(row => row.staff_id)
          .filter(Boolean) as string[]
      ))
      
      const uniqueServiceIds = Array.from(new Set(
        serviceRows
          .flatMap(row => row.service_ids)
          .filter(Boolean)
      ))

      const appointmentData = {
        salon_id: salonId,
        customer_id: selectedCustomer.id,
        staff_id: null, // Keep for backward compatibility, but use junction table
        service_id: null, // Keep for backward compatibility, but use junction table
        appointment_date: appointmentDateTime,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        status: formData.status,
        created_by: profileId,
      }

      let appointmentId: string

      if (appointment) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id)
          .eq('salon_id', salonId)
          .select()
          .single()

        if (error) {
          console.error('Error updating appointment:', error)
          showToast('Randevu güncellenirken hata oluştu', 'error')
          return
        }
        appointmentId = data.id

        // Update staff associations
        await supabase
          .from('appointment_staff')
          .delete()
          .eq('appointment_id', appointmentId)
        
        if (uniqueStaffIds.length > 0) {
          await supabase
            .from('appointment_staff')
            .insert(uniqueStaffIds.map(staffId => ({
              appointment_id: appointmentId,
              staff_id: staffId,
            })))
        }

        // Update service associations
        await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointmentId)
        
        if (uniqueServiceIds.length > 0) {
          await supabase
            .from('appointment_services')
            .insert(uniqueServiceIds.map(serviceId => ({
              appointment_id: appointmentId,
              service_id: serviceId,
            })))
        }

        showToast('Randevu başarıyla güncellendi', 'success')
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single()

        if (error) {
          console.error('Error creating appointment:', error)
          showToast('Randevu oluşturulurken hata oluştu', 'error')
          return
        }
        appointmentId = data.id

        // Create staff associations
        if (uniqueStaffIds.length > 0) {
          await supabase
            .from('appointment_staff')
            .insert(uniqueStaffIds.map(staffId => ({
              appointment_id: appointmentId,
              staff_id: staffId,
            })))
        }

        // Create service associations
        if (uniqueServiceIds.length > 0) {
          await supabase
            .from('appointment_services')
            .insert(uniqueServiceIds.map(serviceId => ({
              appointment_id: appointmentId,
              service_id: serviceId,
            })))
        }

        showToast('Randevu başarıyla oluşturuldu', 'success')
      }

      onClose()
    } catch (err) {
      console.error('Unexpected error:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={appointment ? 'Randevu Düzenle' : 'Yeni Randevu'}
    >
      <div className="space-y-4">
        {/* Customer Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Müşteri <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Müşteri ara (isim veya telefon)..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
              }}
              onFocus={() => {
                if (customerSearch.length >= 2) {
                  setShowCustomerDropdown(true)
                }
              }}
              className="pl-10"
              style={{ paddingTop: '10.8px', paddingBottom: '10.8px' }}
            />
            {showCustomerDropdown && customers.length > 0 && (
              <div className="absolute z-[100] mt-1 w-full rounded-lg border-2 border-blue-200 bg-white shadow-xl max-h-64 overflow-y-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm"
                  >
                    <p className="font-medium text-gray-900">{customer.full_name}</p>
                    <p className="text-xs text-gray-600">{customer.phone}</p>
                  </button>
                ))}
              </div>
            )}
            {showCustomerDropdown && customerSearch.length >= 2 && customers.length === 0 && (
              <div className="absolute z-[100] mt-1 w-full rounded-lg border-2 border-blue-200 bg-white shadow-xl p-4">
                <div className="text-center text-gray-500 mb-3">Müşteri bulunamadı</div>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateCustomerModal(true)
                    setShowCustomerDropdown(false)
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni müşteri ekle
                </Button>
              </div>
            )}
            {selectedCustomer && (
              <div className="mt-2 rounded-lg border shadow-sm p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCustomer.full_name}
                    </p>
                    <p className="text-xs text-gray-600">{selectedCustomer.phone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
                      } else {
                        setServiceRows(rows => rows.map(r => {
                          if (r.id === row.id) {
                            return { ...r, staff_id: null, staff_name: null }
                          }
                          return r
                        }))
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Personel Seçin (Opsiyonel)</option>
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
                  type="button"
                  onClick={() => handleRemoveServiceRow(row.id)}
                  className="mt-6 rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          
          <Button
            type="button"
            onClick={handleAddServiceRow}
            variant="ghost"
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 h-9 text-sm"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Personel/Hizmet ekle
          </Button>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarih <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{ paddingTop: '9.6px', paddingBottom: '9.6px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saat <span className="text-red-500">*</span>
            </label>
            <Input
              type="time"
              value={formData.appointment_time}
              onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
              style={{ paddingTop: '9.6px', paddingBottom: '9.6px' }}
            />
          </div>
        </div>

        {/* Status (only when editing) */}
        {appointment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durum
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as any })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Beklemede</option>
              <option value="CONFIRMED">Onaylandı</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">İptal</option>
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notlar
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Randevu ile ilgili notlar..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1"
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            İptal
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>
      {showCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateCustomerModal(false)}
          onCreate={handleCreateCustomer}
          initialName={customerSearch}
        />
      )}
    </Modal>
  )
}

function CreateCustomerModal({
  onClose,
  onCreate,
  initialName = '',
}: {
  onClose: () => void
  onCreate: (name: string, phone: string) => void
  initialName?: string
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && phone && phone.length === 10) {
      onCreate(name, phone)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Yeni Müşteri Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ad Soyad <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => {
              const value = e.target.value
              // Her kelimenin ilk harfini büyük yap
              const capitalized = value
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              setName(capitalized)
            }}
            autoFocus
            placeholder="Örn: Ahmet Yılmaz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefon <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-500">
              +90
            </span>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                // Sadece rakamları kabul et ve maksimum 10 karakter
                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                setPhone(value)
              }}
              placeholder="5551234567"
              className="pl-12"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-9 text-sm"
          >
            İptal
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
            disabled={!name.trim() || phone.length !== 10}
          >
            Müşteri Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  )
}

