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
import { getLoyaltyLevel, getLoyaltyLevelInfo, LOYALTY_LEVELS } from '@/lib/loyalty'

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
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)

  // Services and Staff
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [staffServicesMap, setStaffServicesMap] = useState<Map<string, string[]>>(new Map())
  
  // Service rows (personel/hizmet seçim satırları)
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([])
  
  // Selected services (final list)
  const [invoiceServices, setInvoiceServices] = useState<InvoiceService[]>([])

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'code'>('none')
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<{
    code: string
    percentage: number
  } | null>(null)

  // Loyalty
  const [customerVisitCount, setCustomerVisitCount] = useState(0)
  const [customerLoyaltyLevel, setCustomerLoyaltyLevel] = useState<string | null>(null)
  const [salonDiscounts, setSalonDiscounts] = useState<{
    loyalty_bronze_discount?: number | null
    loyalty_silver_discount?: number | null
    loyalty_gold_discount?: number | null
    loyalty_platinum_discount?: number | null
    loyalty_vip_discount?: number | null
  } | null>(null)
  const [salonThresholds, setSalonThresholds] = useState<{
    loyalty_silver_min_visits?: number | null
    loyalty_gold_min_visits?: number | null
    loyalty_platinum_min_visits?: number | null
    loyalty_vip_min_visits?: number | null
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadServices()
      loadStaff()
      loadSalonLoyaltySettings()
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

  // Load customer loyalty info when customer is selected
  useEffect(() => {
    if (selectedCustomer && salonDiscounts && salonThresholds) {
      loadCustomerLoyaltyInfo()
    } else {
      setCustomerVisitCount(0)
      setCustomerLoyaltyLevel(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, salonDiscounts, salonThresholds])

  const loadSalonLoyaltySettings = async () => {
    const { data, error } = await supabase
      .from('salons')
      .select('loyalty_bronze_discount, loyalty_silver_discount, loyalty_gold_discount, loyalty_platinum_discount, loyalty_vip_discount, loyalty_silver_min_visits, loyalty_gold_min_visits, loyalty_platinum_min_visits, loyalty_vip_min_visits')
      .eq('id', salonId)
      .single()
    
    if (!error && data) {
      setSalonDiscounts({
        loyalty_bronze_discount: data.loyalty_bronze_discount,
        loyalty_silver_discount: data.loyalty_silver_discount,
        loyalty_gold_discount: data.loyalty_gold_discount,
        loyalty_platinum_discount: data.loyalty_platinum_discount,
        loyalty_vip_discount: data.loyalty_vip_discount,
      })
      setSalonThresholds({
        loyalty_silver_min_visits: data.loyalty_silver_min_visits,
        loyalty_gold_min_visits: data.loyalty_gold_min_visits,
        loyalty_platinum_min_visits: data.loyalty_platinum_min_visits,
        loyalty_vip_min_visits: data.loyalty_vip_min_visits,
      })
    }
  }

  const loadCustomerLoyaltyInfo = async () => {
    if (!selectedCustomer) return

    // Get visit count
    const { count } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', selectedCustomer.id)

    const visitCount = count || 0
    setCustomerVisitCount(visitCount)

    // Get loyalty level
    const level = getLoyaltyLevel(visitCount, salonThresholds || undefined)
    setCustomerLoyaltyLevel(level)
  }

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
      // Load staff services for all staff
      const staffServices = new Map<string, string[]>()
      for (const staff of data) {
        const { data: staffServicesData } = await supabase
          .from('staff_services')
          .select('service_id')
          .eq('staff_id', staff.id)
        
        if (staffServicesData) {
          staffServices.set(staff.id, staffServicesData.map((item: any) => item.service_id))
        } else {
          staffServices.set(staff.id, [])
        }
      }
      setStaffServicesMap(staffServices)
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

  const handleCreateCustomer = async (name: string, phone: string) => {
    if (!name.trim() || !phone.trim()) {
      showToast('Lütfen ad soyad ve telefon numarası girin', 'error')
      return
    }

    setLoading(true)
    try {
      // Telefon formatını düzelt
      const cleanPhone = phone.replace(/\D/g, '')
      let formattedPhone = phone
      
      if (cleanPhone.length > 0) {
        if (cleanPhone.startsWith('0')) {
          formattedPhone = `+90${cleanPhone.slice(1)}`
        } else if (cleanPhone.length === 10) {
          formattedPhone = `+90${cleanPhone}`
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith('90')) {
          formattedPhone = `+${cleanPhone}`
        } else if (!phone.startsWith('+')) {
          formattedPhone = `+90${cleanPhone}`
        }
      }

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
          phone: formattedPhone,
          kvkk_consent_at: new Date().toISOString(),
          has_welcome_discount: true,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          showToast('Bu telefon numarası zaten kayıtlı', 'error')
          // Kayıtlı müşteriyi bul ve seç
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, full_name, phone')
            .eq('salon_id', salonId)
            .eq('phone', formattedPhone)
            .single()
          
          if (existingCustomer) {
            setSelectedCustomer(existingCustomer)
            setCustomerSearch('')
            setShowCustomerDropdown(false)
          }
        } else {
          showToast('Müşteri oluşturulurken hata oluştu', 'error')
        }
        return
      }

      if (data) {
        setSelectedCustomer(data)
        setCustomerSearch('')
        setShowCustomerDropdown(false)
        setShowCreateCustomerModal(false)
        showToast('Müşteri başarıyla oluşturuldu', 'success')
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return

    if (!confirm(`"${selectedCustomer.full_name}" müşterisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    setLoading(true)
    try {
      // Check if customer has invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', selectedCustomer.id)
        .eq('salon_id', salonId)
        .limit(1)

      if (invoicesError) {
        console.error('Error checking invoices:', invoicesError)
      }

      if (invoices && invoices.length > 0) {
        showToast('Bu müşterinin adisyon kayıtları bulunmaktadır. Önce adisyonları silmeniz gerekiyor.', 'error')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id)
        .eq('salon_id', salonId)
        .select()

      if (error) {
        console.error('Error deleting customer:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Check if error is due to RLS policy (permission denied)
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          showToast('Müşteri silme yetkiniz bulunmuyor. Lütfen yönetici ile iletişime geçin.', 'error')
        }
        // Check if error is due to foreign key constraint
        else if (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('violates foreign key')) {
          showToast('Bu müşterinin adisyon kayıtları bulunmaktadır. Önce adisyonları silmeniz gerekiyor.', 'error')
        } else {
          showToast(`Müşteri silinirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`, 'error')
        }
        return
      }

      // Check if actually deleted (data should be an array with the deleted row)
      if (!data || data.length === 0) {
        console.error('Delete returned no data - customer may not exist or RLS policy blocked deletion')
        showToast('Müşteri silinemedi. Lütfen sayfayı yenileyip tekrar deneyin.', 'error')
        return
      }

      // Dispatch event to update recent customers in HomeSearch
      window.dispatchEvent(new CustomEvent('customerDeleted', { detail: { customerId: selectedCustomer.id } }))
      
      setSelectedCustomer(null)
      setCustomerSearch('')
      showToast('Müşteri başarıyla silindi', 'success')
      router.refresh()
    } catch (err) {
      console.error('Error deleting customer:', err)
      showToast('Beklenmeyen bir hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
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

  const handleStaffChange = async (rowId: string, staffId: string) => {
    const staff = staffList.find(s => s.id === staffId)
    
    // Load staff services if staff is selected
    let availableServiceIds: string[] = []
    if (staffId) {
      const { data: staffServicesData } = await supabase
        .from('staff_services')
        .select('service_id')
        .eq('staff_id', staffId)
      
      if (staffServicesData) {
        availableServiceIds = staffServicesData.map((item: any) => item.service_id)
      }
    }
    
    setServiceRows(rows => rows.map(row => {
      if (row.id === rowId) {
        // Filter out services that are not available for this staff
        const filteredServices = staffId && availableServiceIds.length > 0
          ? row.services.filter(s => availableServiceIds.includes(s.id))
          : row.services
        const filteredServiceIds = staffId && availableServiceIds.length > 0
          ? row.service_ids.filter(id => availableServiceIds.includes(id))
          : row.service_ids
        
        return {
          ...row,
          staff_id: staffId,
          staff_name: staff?.full_name || null,
          services: filteredServices,
          service_ids: filteredServiceIds
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

  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      showToast('Lütfen bir indirim kodu girin', 'error')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('salon_id', salonId)
        .eq('code_name', discountCode.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        showToast('Geçersiz indirim kodu', 'error')
        setAppliedDiscountCode(null)
        return
      }

      // Check validity dates
      const currentDate = new Date()
      const validFrom = new Date(data.valid_from)
      const validUntil = new Date(data.valid_until)

      if (currentDate < validFrom || currentDate > validUntil) {
        showToast('Bu indirim kodu geçerli değil veya süresi dolmuş', 'error')
        setAppliedDiscountCode(null)
        return
      }

      // Check if code has customer restriction
      if (data.customer_id && (!selectedCustomer || data.customer_id !== selectedCustomer.id)) {
        showToast('Bu indirim kodu sadece belirli bir müşteri için geçerlidir', 'error')
        setAppliedDiscountCode(null)
        return
      }

      // Check usage limit
      if (data.max_usage && data.usage_count >= data.max_usage) {
        showToast('Bu indirim kodu kullanım limitine ulaşmış', 'error')
        setAppliedDiscountCode(null)
        return
      }

      setAppliedDiscountCode({
        code: data.code_name,
        percentage: data.discount_percentage,
      })
      showToast(`İndirim kodu uygulandı: %${data.discount_percentage} indirim`, 'success')
    } catch (err) {
      console.error('Error applying discount code:', err)
      showToast('İndirim kodu uygulanırken hata oluştu', 'error')
      setAppliedDiscountCode(null)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const subtotal = invoiceServices.reduce((sum, item) => sum + item.total_price, 0)
    
    // Step 1: Calculate loyalty discount (applied first on subtotal)
    let loyaltyDiscountAmount = 0
    let loyaltyDiscountPercentage = 0
    let amountAfterLoyalty = subtotal
    if (customerLoyaltyLevel && salonDiscounts) {
      const levelInfo = getLoyaltyLevelInfo(
        customerLoyaltyLevel as any,
        salonDiscounts,
        salonThresholds || undefined
      )
      loyaltyDiscountPercentage = levelInfo.discount
      loyaltyDiscountAmount = subtotal * (loyaltyDiscountPercentage / 100)
      amountAfterLoyalty = subtotal - loyaltyDiscountAmount
    }

    // Step 2: Calculate manual discount (applied on amount after loyalty discount)
    let manualDiscountAmount = 0
    let amountAfterManual = amountAfterLoyalty
    if (discountType === 'percentage') {
      manualDiscountAmount = amountAfterLoyalty * (discountPercentage / 100)
      amountAfterManual = amountAfterLoyalty - manualDiscountAmount
    }

    // Step 3: Calculate code discount (applied on amount after manual discount)
    let codeDiscountAmount = 0
    if (discountType === 'code' && appliedDiscountCode) {
      codeDiscountAmount = amountAfterManual * (appliedDiscountCode.percentage / 100)
    }

    // Total discount and final amount
    const totalDiscountAmount = loyaltyDiscountAmount + manualDiscountAmount + codeDiscountAmount
    const total = subtotal - totalDiscountAmount

    return {
      subtotal,
      loyaltyDiscountAmount,
      loyaltyDiscountPercentage,
      manualDiscountAmount,
      manualDiscountPercentage: discountType === 'percentage' ? discountPercentage : 0,
      codeDiscountAmount,
      codeDiscountPercentage: appliedDiscountCode?.percentage || 0,
      totalDiscountAmount,
      total
    }
  }

  const handleSave = async () => {
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

      const { subtotal, totalDiscountAmount, total } = calculateTotals()

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          salon_id: salonId,
          customer_id: selectedCustomer?.id || null,
          invoice_number: invoiceNumber,
          subtotal: subtotal.toFixed(2),
          discount_percentage: discountType === 'percentage' ? discountPercentage : 0,
          discount_amount: totalDiscountAmount.toFixed(2),
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

      // If customer is selected, record visit and update loyalty
      if (selectedCustomer) {
        // Create visit record
        const { error: visitError } = await supabase
          .from('visits')
          .insert({
            salon_id: salonId,
            customer_id: selectedCustomer.id,
            created_by: profileId,
            visited_at: new Date().toISOString(),
          })

        if (visitError) {
          console.error('Visit creation error:', visitError)
          // Don't fail the invoice creation if visit recording fails
          // Just log the error
        } else {
          // Update customer last_visit_at
          await supabase
            .from('customers')
            .update({ last_visit_at: new Date().toISOString() })
            .eq('id', selectedCustomer.id)

          // Calculate new visit count
          const { count: newVisitCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', selectedCustomer.id)

          // Update loyalty level based on visit count
          if (newVisitCount !== null) {
            // Load salon thresholds
            const { data: salonData } = await supabase
              .from('salons')
              .select('loyalty_silver_min_visits, loyalty_gold_min_visits, loyalty_platinum_min_visits, loyalty_vip_min_visits')
              .eq('id', salonId)
              .single()
            
            const vipThreshold = salonData?.loyalty_vip_min_visits ?? 40
            const platinumThreshold = salonData?.loyalty_platinum_min_visits ?? 30
            const goldThreshold = salonData?.loyalty_gold_min_visits ?? 20
            const silverThreshold = salonData?.loyalty_silver_min_visits ?? 10
            
            const newLevel = newVisitCount >= vipThreshold ? 'VIP' :
                           newVisitCount >= platinumThreshold ? 'PLATINUM' :
                           newVisitCount >= goldThreshold ? 'GOLD' :
                           newVisitCount >= silverThreshold ? 'SILVER' : 'BRONZE'
            
            // Check if level changed
            const { data: currentCustomer } = await supabase
              .from('customers')
              .select('loyalty_level')
              .eq('id', selectedCustomer.id)
              .single()
            
            if (currentCustomer?.loyalty_level !== newLevel) {
              // Level up! Give discount
              await supabase
                .from('customers')
                .update({
                  loyalty_level: newLevel,
                  has_loyalty_discount: true, // Yeni seviyeye geçince indirim hakkı ver
                })
                .eq('id', selectedCustomer.id)
            }
          }
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
    setCustomerVisitCount(0)
    setCustomerLoyaltyLevel(null)
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
    setAppliedDiscountCode(null)
    setShowCustomerDropdown(false)
    onClose()
  }

  const { subtotal, totalDiscountAmount, total } = calculateTotals()

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Adisyon" size="lg">
      <div className="space-y-4 sm:space-y-6">
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
              style={{ paddingTop: '7.68px', paddingBottom: '7.68px' }}
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
                <div className="p-4">
                  <div className="text-center text-gray-500 mb-3">Müşteri bulunamadı</div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowCreateCustomerModal(true)
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Yeni müşteri ekle
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {selectedCustomer && (
            <Card className="mt-2 bg-blue-50 border-blue-200" style={{ padding: '9.6px' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                  {customerLoyaltyLevel && salonDiscounts && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg">{LOYALTY_LEVELS[customerLoyaltyLevel as keyof typeof LOYALTY_LEVELS]?.icon}</span>
                      <span className="text-xs font-medium text-gray-700">
                        {LOYALTY_LEVELS[customerLoyaltyLevel as keyof typeof LOYALTY_LEVELS]?.name} Seviyesi
                      </span>
                      <span className="text-xs text-gray-500">
                        ({customerVisitCount} ziyaret)
                      </span>
                      {(() => {
                        const levelInfo = getLoyaltyLevelInfo(
                          customerLoyaltyLevel as any,
                          salonDiscounts,
                          salonThresholds || undefined
                        )
                        return (
                          <span className="text-xs font-semibold text-blue-600">
                            %{levelInfo.discount} indirim
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDeleteCustomer()
                  }}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                  title="Müşteriyi sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* Service Rows */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">Personel ve Hizmetler</label>
          {serviceRows.map((row, index) => (
            <div key={row.id} className="flex flex-col sm:flex-row items-start gap-3 p-3 sm:p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
                    services={(() => {
                      if (!row.staff_id) return services
                      const staffServiceIds = staffServicesMap.get(row.staff_id)
                      if (!staffServiceIds || staffServiceIds.length === 0) return []
                      return services.filter(s => staffServiceIds.includes(s.id))
                    })()}
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
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 min-h-[44px] text-sm"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Personel/Hizmet ekle
          </Button>
        </div>

        {/* Selected Services List */}
        {invoiceServices.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Seçilen Hizmetler</label>
            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-lg border-2 border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 text-left text-xs font-semibold text-gray-700" style={{ paddingTop: '7px', paddingBottom: '7px' }}>Hizmet</th>
                    <th className="px-4 text-left text-xs font-semibold text-gray-700" style={{ paddingTop: '7px', paddingBottom: '7px' }}>Personel</th>
                    <th className="text-right text-xs font-semibold text-gray-700" style={{ paddingTop: '7px', paddingBottom: '7px', paddingLeft: '72px', paddingRight: '72px' }}>Tutar</th>
                    <th className="px-4 text-center text-xs font-semibold text-gray-700" style={{ paddingTop: '7px', paddingBottom: '7px' }}>İşlem</th>
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
                          className="w-32 text-right font-semibold text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          step="0.01"
                          min="0"
                        />
                        <span className="ml-2 text-xs text-gray-600">₺</span>
                      </td>
                      <td className="px-4 py-1 text-center">
                        <button
                          onClick={() => handleRemoveService(service.id)}
                          className="rounded-lg p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {invoiceServices.map((service) => (
                <div key={service.id} className="rounded-lg border-2 border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{service.service_name}</p>
                      <p className="text-xs text-gray-600 mt-1">{service.staff_name || 'Personel yok'}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Tutar:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={service.unit_price}
                        onChange={(e) =>
                          handleServicePriceChange(service.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right font-semibold text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        step="0.01"
                        min="0"
                      />
                      <span className="text-xs text-gray-600">₺</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discount Section */}
        <div className="space-y-2 pt-3 border-t-2 border-gray-200">
          <label className="block text-xs font-semibold text-gray-900">İndirim</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">İndirim Yok</option>
              <option value="percentage">İndirim Yüzdesi</option>
              <option value="code">İndirim Kodu</option>
            </select>
            
            {discountType === 'percentage' && (
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) =>
                    setDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                  className="w-full sm:w-24 text-sm min-h-[44px]"
                  placeholder="%"
                  min="0"
                  max="100"
                />
                <span className="text-xs text-gray-600 self-center">Manuel İndirim: {(() => {
                  const { manualDiscountAmount } = calculateTotals()
                  return manualDiscountAmount.toFixed(2)
                })()} ₺</span>
              </div>
            )}
            
            {discountType === 'code' && (
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="flex-1 text-sm min-h-[44px]"
                  placeholder="İndirim kodu girin"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyDiscountCode()
                    }
                  }}
                />
                <Button
                  onClick={handleApplyDiscountCode}
                  size="sm"
                  className="whitespace-nowrap min-h-[44px]"
                >
                  Uygula
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 pt-4 border-t-2 border-gray-200">
          <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-700 font-medium text-sm">Ara Toplam:</span>
            <span className="font-semibold text-gray-900 text-base">{subtotal.toFixed(2)} ₺</span>
          </div>
          
          {(() => {
            const { loyaltyDiscountAmount, loyaltyDiscountPercentage, manualDiscountAmount, manualDiscountPercentage, codeDiscountAmount, codeDiscountPercentage, totalDiscountAmount } = calculateTotals()
            
            return (
              <>
                {loyaltyDiscountAmount > 0 && (
                  <div className="flex items-center justify-between bg-purple-50 p-2 rounded-lg">
                    <span className="text-gray-700 font-medium text-sm">
                      Sadakat İndirimi (%{loyaltyDiscountPercentage.toFixed(0)}):
                    </span>
                    <span className="font-semibold text-purple-600 text-base">-{loyaltyDiscountAmount.toFixed(2)} ₺</span>
                  </div>
                )}
                {manualDiscountAmount > 0 && (
                  <div className="flex items-center justify-between bg-orange-50 p-2 rounded-lg">
                    <span className="text-gray-700 font-medium text-sm">
                      Manuel İndirim (%{manualDiscountPercentage.toFixed(0)}):
                    </span>
                    <span className="font-semibold text-orange-600 text-base">-{manualDiscountAmount.toFixed(2)} ₺</span>
                  </div>
                )}
                {codeDiscountAmount > 0 && (
                  <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                    <span className="text-gray-700 font-medium text-sm">
                      İndirim Kodu (%{codeDiscountPercentage.toFixed(0)}):
                    </span>
                    <span className="font-semibold text-green-600 text-base">-{codeDiscountAmount.toFixed(2)} ₺</span>
                  </div>
                )}
                {totalDiscountAmount > 0 && (
                  <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg">
                    <span className="text-gray-700 font-medium text-sm">Toplam İndirim:</span>
                    <span className="font-semibold text-red-600 text-base">-{totalDiscountAmount.toFixed(2)} ₺</span>
                  </div>
                )}
              </>
            )
          })()}
          
          <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300 bg-blue-50 p-3 rounded-lg">
            <span className="text-lg font-bold text-gray-900">Toplam:</span>
            <span className="text-2xl font-bold text-blue-600">{total.toFixed(2)} ₺</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1 min-h-[44px] text-sm"
            disabled={saving}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || invoiceServices.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px] text-sm"
          >
            {saving ? 'Kaydediliyor...' : 'Adisyonu Kaydet'}
          </Button>
        </div>
      </div>
    </Modal>
    {showCreateCustomerModal && (
      <CreateCustomerModal
        onClose={() => setShowCreateCustomerModal(false)}
        onCreate={handleCreateCustomer}
        initialName={customerSearch}
      />
    )}
    </>
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
