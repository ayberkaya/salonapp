'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { getLoyaltyLevel, getLoyaltyDiscount, LOYALTY_LEVELS } from '@/lib/loyalty'
import { 
  Receipt, 
  Search, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Scissors
} from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'

type Profile = Database['public']['Tables']['profiles']['Row']

type Invoice = {
  id: string
  invoice_number: string
  subtotal: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  customers: {
    full_name: string
    phone: string
  }
  invoice_staff: Array<{
    staff_id: string
    staff: {
      full_name: string
    }
  }>
  invoice_items?: Array<{
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
}

type StaffRevenue = {
  staff_id: string
  staff_name: string
  total_revenue: number
  invoice_count: number
  average_revenue: number
}

type DailyRevenue = {
  date: string
  revenue: number
  invoice_count: number
}

interface RevenueReportProps {
  profile: Profile
}

export default function RevenueReport({ profile }: RevenueReportProps) {
  const supabase = createClient()
  const { showToast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Date filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('month')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Staff filter
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([])
  
  // Salon loyalty settings
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
  
  // Customer visit counts map
  const [customerVisitCounts, setCustomerVisitCounts] = useState<Map<string, number>>(new Map())
  
  // Statistics
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [filteredRevenue, setFilteredRevenue] = useState(0)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [filteredInvoiceCount, setFilteredInvoiceCount] = useState(0)
  const [averageInvoice, setAverageInvoice] = useState(0)
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [filteredDiscount, setFilteredDiscount] = useState(0)
  
  // Detailed data
  const [staffRevenue, setStaffRevenue] = useState<StaffRevenue[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  
  // Accordion states
  const [isStaffRevenueOpen, setIsStaffRevenueOpen] = useState(false)
  const [isDailyRevenueOpen, setIsDailyRevenueOpen] = useState(false)
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false)
  const [isDiscountDetailsOpen, setIsDiscountDetailsOpen] = useState(false)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [invoiceItemsMap, setInvoiceItemsMap] = useState<Map<string, Array<{
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>>>(new Map())

  useEffect(() => {
    // Set default date range to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
    
    loadStaff()
    loadSalonLoyaltySettings()
  }, [])

  useEffect(() => {
    loadInvoices()
    loadStatistics()
    loadStaffRevenue()
    loadDailyRevenue()
  }, [dateFilter, startDate, endDate, staffFilter, searchQuery])

  useEffect(() => {
    // Load visit counts for customers when invoices change
    if (invoices.length > 0 && salonDiscounts && salonThresholds) {
      loadCustomerVisitCounts()
    }
  }, [invoices, salonDiscounts, salonThresholds])

  const getDateRange = () => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now.setHours(23, 59, 59, 999))

    if (dateFilter === 'today') {
      start = new Date(now.setHours(0, 0, 0, 0))
    } else if (dateFilter === 'week') {
      start = new Date(now.setDate(now.getDate() - 7))
    } else if (dateFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dateFilter === 'year') {
      start = new Date(now.getFullYear(), 0, 1)
    } else if (dateFilter === 'custom' && startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
    } else {
      return null
    }

    return { start, end }
  }

  const loadInvoices = async () => {
    setLoading(true)
    
    // Get invoice IDs if staff filter is active
    let invoiceIds: string[] | null = null
    if (staffFilter !== 'all') {
      const { data: staffInvoices } = await supabase
        .from('invoice_staff')
        .select('invoice_id')
        .eq('staff_id', staffFilter)

      if (staffInvoices && staffInvoices.length > 0) {
        invoiceIds = staffInvoices.map((si: any) => si.invoice_id)
      } else {
        setInvoices([])
        setLoading(false)
        return
      }
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (full_name, phone),
        invoice_staff (
          staff_id,
          staff (full_name)
        ),
        invoice_items (
          service_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('salon_id', profile.salon_id)

    // Staff filter
    if (invoiceIds) {
      query = query.in('id', invoiceIds)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const dateRange = getDateRange()
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500)

    if (error) {
      console.error('Error loading invoices:', error)
      showToast('Adisyonlar yüklenirken hata oluştu', 'error')
    } else {
      let filtered = data || []

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (inv: Invoice) =>
            inv.invoice_number.toLowerCase().includes(query) ||
            inv.customers?.full_name.toLowerCase().includes(query) ||
            inv.customers?.phone.includes(query)
        )
      }

      setInvoices(filtered)
    }
    setLoading(false)
  }

  const loadStaff = async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('salon_id', profile.salon_id)
      .eq('is_active', true)
      .order('full_name')

    if (data) {
      setStaffList(data)
    }
  }

  const loadSalonLoyaltySettings = async () => {
    const { data, error } = await supabase
      .from('salons')
      .select('loyalty_bronze_discount, loyalty_silver_discount, loyalty_gold_discount, loyalty_platinum_discount, loyalty_vip_discount, loyalty_silver_min_visits, loyalty_gold_min_visits, loyalty_platinum_min_visits, loyalty_vip_min_visits')
      .eq('id', profile.salon_id)
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

  const loadCustomerVisitCounts = async () => {
    // Get unique customer IDs from invoices
    const customerIds = Array.from(new Set(invoices.map(inv => inv.customers?.phone).filter(Boolean)))
    
    if (customerIds.length === 0) return

    // Get customer IDs by phone
    const { data: customers } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('salon_id', profile.salon_id)
      .in('phone', customerIds)

    if (!customers || customers.length === 0) return

    const customerIdMap = new Map(customers.map(c => [c.phone, c.id]))
    
    // Get visit counts for each customer
    const visitCountPromises = Array.from(customerIdMap.entries()).map(async ([phone, customerId]) => {
      const { count } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
      
      return { phone, visitCount: count || 0 }
    })

    const visitCounts = await Promise.all(visitCountPromises)
    const visitCountMap = new Map(visitCounts.map(v => [v.phone, v.visitCount]))
    setCustomerVisitCounts(visitCountMap)
  }

  const loadStatistics = async () => {
    // Total revenue (all time)
    const { data: totalData } = await supabase
      .from('invoices')
      .select('total_amount, subtotal, discount_amount')
      .eq('salon_id', profile.salon_id)

    if (totalData) {
      const total = totalData.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0)
      const totalDiscountAmount = totalData.reduce((sum, inv) => sum + parseFloat((inv.discount_amount || 0).toString()), 0)
      setTotalRevenue(total)
      setInvoiceCount(totalData.length)
      setTotalDiscount(totalDiscountAmount)
    }

    // Filtered statistics
    const dateRange = getDateRange()
    let filteredQuery = supabase
      .from('invoices')
      .select('total_amount, discount_amount, discount_percentage')
      .eq('salon_id', profile.salon_id)

    if (dateFilter !== 'all' && dateRange) {
      filteredQuery = filteredQuery
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
    }

    // Staff filter
    if (staffFilter !== 'all') {
      const { data: staffInvoices } = await supabase
        .from('invoice_staff')
        .select('invoice_id')
        .eq('staff_id', staffFilter)

      if (staffInvoices && staffInvoices.length > 0) {
        const invoiceIds = staffInvoices.map((si: any) => si.invoice_id)
        filteredQuery = filteredQuery.in('id', invoiceIds)
      } else {
        setFilteredRevenue(0)
        setFilteredInvoiceCount(0)
        setAverageInvoice(0)
        return
      }
    }

    const { data: filteredData } = await filteredQuery

    if (filteredData) {
      const filtered = filteredData.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0)
      const filteredDiscountAmount = filteredData.reduce((sum, inv) => sum + parseFloat((inv.discount_amount || 0).toString()), 0)
      setFilteredRevenue(filtered)
      setFilteredInvoiceCount(filteredData.length)
      setAverageInvoice(filteredData.length > 0 ? filtered / filteredData.length : 0)
      setFilteredDiscount(filteredDiscountAmount)
    }
  }

  const loadStaffRevenue = async () => {
    const dateRange = getDateRange()
    let query = supabase
      .from('invoice_staff')
      .select(`
        staff_id,
        staff (full_name),
        invoices!inner (total_amount, salon_id, created_at)
      `)
      .eq('invoices.salon_id', profile.salon_id)

    if (dateFilter !== 'all' && dateRange) {
      query = query
        .gte('invoices.created_at', dateRange.start.toISOString())
        .lte('invoices.created_at', dateRange.end.toISOString())
    }

    const { data } = await query

    if (data) {
      const revenueMap = new Map<string, { name: string; revenue: number; count: number }>()

      data.forEach((item: any) => {
        const staffId = item.staff_id
        const staffName = item.staff?.full_name || 'Bilinmeyen'
        const amount = parseFloat(item.invoices?.total_amount?.toString() || '0')

        if (revenueMap.has(staffId)) {
          const existing = revenueMap.get(staffId)!
          revenueMap.set(staffId, {
            name: staffName,
            revenue: existing.revenue + amount,
            count: existing.count + 1,
          })
        } else {
          revenueMap.set(staffId, {
            name: staffName,
            revenue: amount,
            count: 1,
          })
        }
      })

      const revenueArray: StaffRevenue[] = Array.from(revenueMap.entries()).map(([id, data]) => ({
        staff_id: id,
        staff_name: data.name,
        total_revenue: data.revenue,
        invoice_count: data.count,
        average_revenue: data.revenue / data.count,
      }))

      revenueArray.sort((a, b) => b.total_revenue - a.total_revenue)
      setStaffRevenue(revenueArray)
    }
  }

  const loadDailyRevenue = async () => {
    const dateRange = getDateRange()
    if (!dateRange) return

    let query = supabase
      .from('invoices')
      .select('total_amount, created_at')
      .eq('salon_id', profile.salon_id)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .order('created_at', { ascending: true })

    // Staff filter
    if (staffFilter !== 'all') {
      const { data: staffInvoices } = await supabase
        .from('invoice_staff')
        .select('invoice_id')
        .eq('staff_id', staffFilter)

      if (staffInvoices && staffInvoices.length > 0) {
        const invoiceIds = staffInvoices.map((si: any) => si.invoice_id)
        query = query.in('id', invoiceIds)
      } else {
        setDailyRevenue([])
        return
      }
    }

    const { data } = await query

    if (data) {
      const dailyMap = new Map<string, { revenue: number; count: number }>()

      data.forEach((invoice: any) => {
        const date = new Date(invoice.created_at).toISOString().split('T')[0]
        const amount = parseFloat(invoice.total_amount.toString())

        if (dailyMap.has(date)) {
          const existing = dailyMap.get(date)!
          dailyMap.set(date, {
            revenue: existing.revenue + amount,
            count: existing.count + 1,
          })
        } else {
          dailyMap.set(date, {
            revenue: amount,
            count: 1,
          })
        }
      })

      const dailyArray: DailyRevenue[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          invoice_count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyRevenue(dailyArray)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const clearFilters = () => {
    setDateFilter('all')
    setStaffFilter('all')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = dateFilter !== 'all' || staffFilter !== 'all' || searchQuery.trim() !== ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ciro Raporu</h1>
          <p className="mt-1 text-gray-600">Detaylı gelir ve adisyon analizleri</p>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ padding: '19.2px' }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtreler
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                Filtreleri Temizle
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarih Aralığı
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Bu Ay</option>
                <option value="year">Bu Yıl</option>
                <option value="custom">Özel Tarih</option>
                <option value="all">Tüm Zamanlar</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Staff Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personel
              </label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Personel</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ara
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Adisyon no, müşteri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-black"
                  style={{ paddingTop: '6.48px', paddingBottom: '6.48px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card style={{ padding: '13.82px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Toplam Ciro (Tüm Zamanlar)</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {totalRevenue.toFixed(2)} ₺
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="text-green-600" style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '13.82px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Filtrelenmiş Ciro</p>
              <p className="mt-1 text-xl font-bold text-blue-600">
                {filteredRevenue.toFixed(2)} ₺
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <TrendingUp className="text-blue-600" style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '13.82px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Adisyon Sayısı</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{filteredInvoiceCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ortalama: {averageInvoice.toFixed(2)} ₺
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
              <Receipt className="text-purple-600" style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '13.82px' }}>
          <button
            onClick={() => setIsDiscountDetailsOpen(!isDiscountDetailsOpen)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Toplam İndirim</p>
                <p className="mt-1 text-xl font-bold text-red-600">
                  {filteredDiscount > 0 ? filteredDiscount.toFixed(2) : totalDiscount.toFixed(2)} ₺
                </p>
                {filteredDiscount > 0 && filteredDiscount !== totalDiscount && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tüm zamanlar: {totalDiscount.toFixed(2)} ₺
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                  <BarChart3 className="text-red-600" style={{ width: '16px', height: '16px' }} />
                </div>
                {isDiscountDetailsOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </div>
          </button>
        </Card>
      </div>

      {/* Discount Details */}
      {isDiscountDetailsOpen && (
        <Card className="p-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            İndirim Detayları
          </h2>
          {(() => {
            const discountedInvoices = invoices.filter(
              (inv) => inv.discount_percentage > 0 || inv.discount_amount > 0
            )
            
            if (discountedInvoices.length === 0) {
              return (
                <div className="py-8 text-center text-gray-500">
                  Seçilen filtreler için indirim uygulanan adisyon bulunamadı
                </div>
              )
            }

            // Group discounts by type (loyalty, manual, code, fixed)
            const discountGroups = new Map<string, {
              label: string
              percentage: number | null
              totalAmount: number
              invoiceCount: number
            }>()

            discountedInvoices.forEach((invoice) => {
              const percentage = invoice.discount_percentage || 0
              const amount = parseFloat((invoice.discount_amount || 0).toString())
              
              // Skip if no actual discount
              if (amount <= 0) return
              
              let groupKey: string
              let label: string
              
              // Check if this is a loyalty discount
              const customerPhone = invoice.customers?.phone
              const visitCount = customerPhone ? (customerVisitCounts.get(customerPhone) || 0) : 0
              
              // Calculate actual discount percentage from amount and subtotal
              const subtotal = invoice.subtotal || 0
              const calculatedPercentage = subtotal > 0 ? (amount / subtotal) * 100 : 0
              const effectivePercentage = percentage > 0 ? percentage : calculatedPercentage
              
              if (salonDiscounts && salonThresholds && customerPhone && visitCount >= 0) {
                const loyaltyLevel = getLoyaltyLevel(visitCount, salonThresholds)
                const loyaltyDiscountPercentage = getLoyaltyDiscount(loyaltyLevel, salonDiscounts)
                
                // If customer has a loyalty level and discount is applied, it's likely a loyalty discount
                // Check if the discount percentage matches (with tolerance) or if percentage is 0 but discount exists
                if (loyaltyDiscountPercentage > 0 && (
                  (effectivePercentage > 0 && Math.abs(effectivePercentage - loyaltyDiscountPercentage) < 0.01) ||
                  (effectivePercentage === 0 && amount > 0) // If percentage is 0 but discount exists, assume loyalty
                )) {
                  // This is a loyalty discount
                  const levelName = LOYALTY_LEVELS[loyaltyLevel].name
                  groupKey = `loyalty_${loyaltyLevel}_${loyaltyDiscountPercentage}`
                  label = `%${loyaltyDiscountPercentage.toFixed(0)} Sadakat İndirimi (${levelName})`
                } else if (effectivePercentage > 0) {
                  // Manual percentage discount (doesn't match loyalty)
                  groupKey = `manual_${effectivePercentage.toFixed(0)}`
                  label = `%${effectivePercentage.toFixed(0)} Manuel İndirim`
                } else {
                  // If customer has loyalty but discount doesn't match, still show as loyalty
                  // (edge case: percentage might be stored incorrectly)
                  const levelName = LOYALTY_LEVELS[loyaltyLevel].name
                  groupKey = `loyalty_${loyaltyLevel}_${loyaltyDiscountPercentage || 10}`
                  label = `%${(loyaltyDiscountPercentage || 10).toFixed(0)} Sadakat İndirimi (${levelName})`
                }
              } else if (effectivePercentage > 0) {
                // Manual percentage discount (no loyalty info available)
                groupKey = `manual_${effectivePercentage.toFixed(0)}`
                label = `%${effectivePercentage.toFixed(0)} İndirim`
              } else {
                // No loyalty info and no percentage - show as unknown discount
                groupKey = 'unknown_discount'
                label = 'İndirim'
              }
              
              if (discountGroups.has(groupKey)) {
                const existing = discountGroups.get(groupKey)!
                discountGroups.set(groupKey, {
                  label: existing.label,
                  percentage: percentage > 0 ? percentage : null,
                  totalAmount: existing.totalAmount + amount,
                  invoiceCount: existing.invoiceCount + 1,
                })
              } else {
                discountGroups.set(groupKey, {
                  label,
                  percentage: percentage > 0 ? percentage : null,
                  totalAmount: amount,
                  invoiceCount: 1,
                })
              }
            })

            // Convert to array and sort by total amount (descending)
            const discountGroupsArray = Array.from(discountGroups.values())
              .sort((a, b) => b.totalAmount - a.totalAmount)

            return (
              <div className="space-y-3">
                {discountGroupsArray.map((group, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {group.label}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {group.invoiceCount} adisyon
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {group.totalAmount.toFixed(2)} ₺
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 rounded-lg bg-red-100 p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Toplam İndirim ({discountedInvoices.length} adisyon):
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      {discountedInvoices.reduce(
                        (sum, inv) => sum + parseFloat((inv.discount_amount || 0).toString()),
                        0
                      ).toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
        </Card>
      )}

      {/* Staff Revenue */}
      {staffRevenue.length > 0 && (
        <Card className="p-3">
          <button
            onClick={() => setIsStaffRevenueOpen(!isStaffRevenueOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personel Bazlı Ciro
            </h2>
            {isStaffRevenueOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {isStaffRevenueOpen && (
            <div className="mt-3 space-y-2">
              {staffRevenue.map((staff) => (
                <div
                  key={staff.staff_id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{staff.staff_name}</p>
                      <p className="text-xs text-gray-600">{staff.invoice_count} adisyon</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {staff.total_revenue.toFixed(2)} ₺
                    </p>
                    <p className="text-xs text-gray-500">
                      Ort: {staff.average_revenue.toFixed(2)} ₺
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Daily Revenue Chart */}
      {dailyRevenue.length > 0 && (
        <Card className="p-3">
          <button
            onClick={() => setIsDailyRevenueOpen(!isDailyRevenueOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Günlük Ciro Trendi
            </h2>
            {isDailyRevenueOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {isDailyRevenueOpen && (
            <div className="mt-3 space-y-2">
              {dailyRevenue.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(day.date)}
                    </p>
                    <p className="text-xs text-gray-600">{day.invoice_count} adisyon</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {day.revenue.toFixed(2)} ₺
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Invoice List */}
      <Card className="p-3">
        <button
          onClick={() => setIsInvoiceListOpen(!isInvoiceListOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Adisyon Detayları
          </h2>
          {isInvoiceListOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {isInvoiceListOpen && (
          <div className="mt-3">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
            ) : invoices.length === 0 ? (
              <EmptyState
                title="Adisyon bulunamadı"
                description="Seçilen filtreler için adisyon bulunamadı"
              />
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => {
                  const isExpanded = expandedInvoices.has(invoice.id)
                  return (
                    <div
                      key={invoice.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => {
                          setExpandedInvoices(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(invoice.id)) {
                              newSet.delete(invoice.id)
                            } else {
                              newSet.add(invoice.id)
                            }
                            return newSet
                          })
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="default">{invoice.invoice_number}</Badge>
                            <span className="text-xs text-gray-500">
                              {formatDate(invoice.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.customers?.full_name || 'Bilinmeyen Müşteri'}
                          </p>
                          <p className="text-xs text-gray-600">{invoice.customers?.phone}</p>
                          {invoice.invoice_staff && invoice.invoice_staff.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {invoice.invoice_staff.map((is, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {is.staff?.full_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex items-start gap-2">
                          <div>
                            {invoice.discount_percentage > 0 && (
                              <p className="text-xs text-gray-500 line-through">
                                {invoice.subtotal.toFixed(2)} ₺
                              </p>
                            )}
                            <p className="text-lg font-bold text-green-600">
                              {invoice.total_amount.toFixed(2)} ₺
                            </p>
                            {invoice.discount_percentage > 0 && (
                              <p className="text-xs text-red-600">
                                %{invoice.discount_percentage} indirim
                              </p>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-500 mt-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500 mt-1" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <InvoiceDetailsContent 
                          invoice={invoice}
                          invoiceItemsMap={invoiceItemsMap}
                          setInvoiceItemsMap={setInvoiceItemsMap}
                          supabase={supabase}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function InvoiceDetailsContent({
  invoice,
  invoiceItemsMap,
  setInvoiceItemsMap,
  supabase,
}: {
  invoice: Invoice
  invoiceItemsMap: Map<string, Array<{
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>>
  setInvoiceItemsMap: React.Dispatch<React.SetStateAction<Map<string, Array<{
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>>>>
  supabase: ReturnType<typeof createClient>
}) {
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    // Load invoice items if not already loaded
    if (!invoiceItemsMap.has(invoice.id)) {
      const loadItems = async () => {
        setLoadingItems(true)
        const { data, error } = await supabase
          .from('invoice_items')
          .select('service_name, quantity, unit_price, total_price')
          .eq('invoice_id', invoice.id)
          .order('created_at', { ascending: true })

        if (!error && data) {
          setInvoiceItemsMap(prev => {
            const newMap = new Map(prev)
            newMap.set(invoice.id, data.map(item => ({
              service_name: item.service_name,
              quantity: item.quantity,
              unit_price: parseFloat(item.unit_price.toString()),
              total_price: parseFloat(item.total_price.toString()),
            })))
            return newMap
          })
        }
        setLoadingItems(false)
      }
      loadItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id])

  const items = invoiceItemsMap.get(invoice.id) || invoice.invoice_items || []

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
      {/* Invoice Items */}
      {loadingItems ? (
        <div className="text-sm text-gray-500">Hizmet detayları yükleniyor...</div>
      ) : items.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Yapılan İşlemler
          </h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.service_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} adet × {item.unit_price.toFixed(2)} ₺
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.total_price.toFixed(2)} ₺
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Hizmet detayı bulunamadı</div>
      )}

      {/* Discount Details */}
      {(invoice.discount_percentage > 0 || invoice.discount_amount > 0) && (
        <div className="rounded-lg bg-red-50 p-3">
          <h3 className="text-sm font-semibold text-red-900 mb-2">
            İndirim Detayları
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Ara Toplam:</span>
              <span className="font-normal text-black">{invoice.subtotal.toFixed(2)} ₺</span>
            </div>
            {invoice.discount_percentage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">
                  İndirim (%{invoice.discount_percentage}):
                </span>
                <span className="font-medium text-red-600">
                  -{invoice.discount_amount.toFixed(2)} ₺
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-red-200">
              <span className="font-semibold text-gray-900">Toplam:</span>
              <span className="font-bold text-green-600">
                {invoice.total_amount.toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-lg bg-blue-50 p-3">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Notlar</h3>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}

