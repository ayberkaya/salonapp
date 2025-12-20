'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { Receipt, Search, Filter, Calendar, TrendingUp, Users, DollarSign, Plus } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import InvoiceModal from '@/components/InvoiceModal'

type Profile = Database['public']['Tables']['profiles']['Row']

type Invoice = {
  id: string
  invoice_number: string
  subtotal: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
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
}

type StaffRevenue = {
  staff_id: string
  staff_name: string
  total_revenue: number
  invoice_count: number
}

interface InvoicesListProps {
  profile: Profile
}

export default function InvoicesList({ profile }: InvoicesListProps) {
  const supabase = createClient()
  const { showToast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([])
  const [staffRevenue, setStaffRevenue] = useState<StaffRevenue[]>([])

  // Statistics
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [invoiceCount, setInvoiceCount] = useState(0)

  // Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  useEffect(() => {
    loadInvoices()
    loadStaff()
    loadStatistics()
    loadStaffRevenue()
  }, [dateFilter, staffFilter, searchQuery])

  const loadInvoices = async () => {
    setLoading(true)
    
    // First, get invoice IDs if staff filter is active
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
        )
      `)
      .eq('salon_id', profile.salon_id)

    // Staff filter
    if (invoiceIds) {
      query = query.in('id', invoiceIds)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date

      if (dateFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0))
      } else if (dateFilter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7))
      } else if (dateFilter === 'month') {
        startDate = new Date(now.setDate(now.getDate() - 30))
      }

      query = query.gte('created_at', startDate!.toISOString())
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100)

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

  const loadStatistics = async () => {
    // Total revenue
    const { data: totalData } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('salon_id', profile.salon_id)

    if (totalData) {
      const total = totalData.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0)
      setTotalRevenue(total)
      setInvoiceCount(totalData.length)
    }

    // Today's revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayData } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('salon_id', profile.salon_id)
      .gte('created_at', today.toISOString())

    if (todayData) {
      const todayTotal = todayData.reduce(
        (sum, inv) => sum + parseFloat(inv.total_amount.toString()),
        0
      )
      setTodayRevenue(todayTotal)
    }
  }

  const loadStaffRevenue = async () => {
    const { data } = await supabase
      .from('invoice_staff')
      .select(`
        staff_id,
        staff (full_name),
        invoices!inner (total_amount, salon_id)
      `)
      .eq('invoices.salon_id', profile.salon_id)

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
      }))

      revenueArray.sort((a, b) => b.total_revenue - a.total_revenue)
      setStaffRevenue(revenueArray)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Adisyonlar</h1>
          <p className="mt-1 text-gray-600">Tüm adisyonları görüntüleyin ve yönetin</p>
        </div>
        <Button onClick={() => setShowInvoiceModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Adisyon Ekle
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card style={{ padding: '17.28px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Toplam Ciro</p>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {totalRevenue.toFixed(2)} ₺
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="text-green-600" style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '17.28px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Bugünkü Ciro</p>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {todayRevenue.toFixed(2)} ₺
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              <TrendingUp className="text-blue-600" style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '17.28px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Toplam Adisyon</p>
              <p className="mt-1.5 text-xl font-bold text-gray-900">{invoiceCount}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
              <Receipt className="text-purple-600" style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '17.28px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Ortalama Adisyon</p>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {invoiceCount > 0 ? (totalRevenue / invoiceCount).toFixed(2) : '0.00'} ₺
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
              <Calendar className="text-orange-600" style={{ width: '18px', height: '18px' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ padding: '19.2px' }}>
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row w-full">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Adisyon no, müşteri adı veya telefon ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-black"
                style={{ paddingTop: '6.48px', paddingBottom: '6.48px' }}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="rounded-lg border border-gray-300 px-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ paddingTop: '5.4px', paddingBottom: '5.4px' }}
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Son 30 Gün</option>
              </select>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ paddingTop: '5.4px', paddingBottom: '5.4px' }}
              >
                <option value="all">Tüm Personel</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Staff Revenue */}
      {staffRevenue.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Personel Bazlı Ciro</h2>
          <div className="space-y-3">
            {staffRevenue.map((staff) => (
              <div
                key={staff.staff_id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{staff.staff_name}</p>
                    <p className="text-sm text-gray-600">{staff.invoice_count} adisyon</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {staff.total_revenue.toFixed(2)} ₺
                  </p>
                  <p className="text-xs text-gray-500">
                    Ort: {(staff.total_revenue / staff.invoice_count).toFixed(2)} ₺
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invoices List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Adisyon Listesi</h2>
        {loading ? (
          <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="Adisyon bulunamadı"
            description="Henüz adisyon oluşturulmamış"
          />
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md"
                style={{ padding: '12.8px' }}
              >
                <div className="flex items-start justify-between">
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
                  <div className="text-right">
                    {invoice.discount_percentage > 0 && (
                      <p className="text-xs text-gray-500 line-through">
                        {invoice.subtotal.toFixed(2)} ₺
                      </p>
                    )}
                    <p className="text-xl font-bold text-green-600">
                      {invoice.total_amount.toFixed(2)} ₺
                    </p>
                    {invoice.discount_percentage > 0 && (
                      <p className="text-xs text-red-600">
                        %{invoice.discount_percentage} indirim
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false)
          loadInvoices()
          loadStatistics()
          loadStaffRevenue()
        }}
        salonId={profile.salon_id}
        profileId={profile.id}
      />
    </div>
  )
}

