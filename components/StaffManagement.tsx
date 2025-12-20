'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Users, Plus, Edit2, Trash2, X, Save, TrendingUp, DollarSign, Calendar, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

type Staff = {
  id: string
  salon_id: string
  full_name: string
  phone: string | null
  is_active: boolean
  work_start_time: string | null
  work_end_time: string | null
  created_at: string
}

type StaffPerformance = {
  staff_id: string
  total_revenue: number
  invoice_count: number
  appointment_count: number
  average_invoice: number
  last_activity: string | null
}

interface StaffManagementProps {
  salonId: string
  profileId: string
}

export default function StaffManagement({ salonId, profileId }: StaffManagementProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    work_start_time: '',
    work_end_time: '',
  })
  const [saving, setSaving] = useState(false)
  const [performanceData, setPerformanceData] = useState<Map<string, StaffPerformance>>(new Map())
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [])

  useEffect(() => {
    if (staff.length > 0) {
      loadPerformanceData()
    }
  }, [staff, dateFilter])

  const loadStaff = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading staff:', error)
      showToast('Personel listesi yüklenirken hata oluştu', 'error')
    } else {
      setStaff(data || [])
    }
    setLoading(false)
  }

  const loadPerformanceData = async () => {
    setLoadingPerformance(true)
    const performanceMap = new Map<string, StaffPerformance>()

    // Date filter
    let dateFilterStart: Date | null = null
    const now = new Date()
    if (dateFilter === 'today') {
      dateFilterStart = new Date(now.setHours(0, 0, 0, 0))
    } else if (dateFilter === 'week') {
      dateFilterStart = new Date(now.setDate(now.getDate() - 7))
    } else if (dateFilter === 'month') {
      dateFilterStart = new Date(now.setDate(now.getDate() - 30))
    }

    // Initialize performance data for all staff
    staff.forEach(s => {
      performanceMap.set(s.id, {
        staff_id: s.id,
        total_revenue: 0,
        invoice_count: 0,
        appointment_count: 0,
        average_invoice: 0,
        last_activity: null,
      })
    })

    // Load invoice data
    let invoiceQuery = supabase
      .from('invoices')
      .select(`
        id,
        total_amount,
        created_at,
        invoice_staff!inner(staff_id)
      `)
      .eq('salon_id', salonId)

    if (dateFilterStart) {
      invoiceQuery = invoiceQuery.gte('created_at', dateFilterStart.toISOString())
    }

    const { data: invoices, error: invoiceError } = await invoiceQuery

    if (!invoiceError && invoices) {
      invoices.forEach((invoice: any) => {
        const staffIds = Array.isArray(invoice.invoice_staff) 
          ? invoice.invoice_staff.map((is: any) => is.staff_id)
          : [invoice.invoice_staff?.staff_id].filter(Boolean)
        
        staffIds.forEach((staffId: string) => {
          const perf = performanceMap.get(staffId)
          if (perf) {
            perf.total_revenue += parseFloat(invoice.total_amount || 0)
            perf.invoice_count += 1
            if (!perf.last_activity || invoice.created_at > perf.last_activity) {
              perf.last_activity = invoice.created_at
            }
          }
        })
      })
    }

    // Load appointment data
    let appointmentQuery = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_staff!inner(staff_id)
      `)
      .eq('salon_id', salonId)

    if (dateFilterStart) {
      appointmentQuery = appointmentQuery.gte('appointment_date', dateFilterStart.toISOString())
    }

    const { data: appointments, error: appointmentError } = await appointmentQuery

    if (!appointmentError && appointments) {
      appointments.forEach((appointment: any) => {
        const staffIds = Array.isArray(appointment.appointment_staff)
          ? appointment.appointment_staff.map((as: any) => as.staff_id)
          : [appointment.appointment_staff?.staff_id].filter(Boolean)
        
        staffIds.forEach((staffId: string) => {
          const perf = performanceMap.get(staffId)
          if (perf) {
            perf.appointment_count += 1
            if (!perf.last_activity || appointment.appointment_date > perf.last_activity) {
              perf.last_activity = appointment.appointment_date
            }
          }
        })
      })
    }

    // Calculate averages
    performanceMap.forEach((perf, staffId) => {
      if (perf.invoice_count > 0) {
        perf.average_invoice = perf.total_revenue / perf.invoice_count
      }
    })

    setPerformanceData(performanceMap)
    setLoadingPerformance(false)
  }

  const togglePerformanceView = (staffId: string) => {
    setExpandedStaff(prev => {
      const newSet = new Set(prev)
      if (newSet.has(staffId)) {
        newSet.delete(staffId)
      } else {
        newSet.add(staffId)
      }
      return newSet
    })
  }

  const handleAdd = () => {
    setFormData({ full_name: '', phone: '', work_start_time: '', work_end_time: '' })
    setShowAddModal(true)
  }

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember)
    setFormData({
      full_name: staffMember.full_name,
      phone: staffMember.phone || '',
      work_start_time: staffMember.work_start_time || '',
      work_end_time: staffMember.work_end_time || '',
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      showToast('Ad soyad gereklidir', 'error')
      return
    }

    setSaving(true)
    try {
      // Her kelimenin ilk harfini büyük yap
      const capitalizeWords = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update({
            full_name: capitalizeWords(formData.full_name),
            phone: formData.phone.trim() || null,
            work_start_time: formData.work_start_time.trim() || null,
            work_end_time: formData.work_end_time.trim() || null,
          })
          .eq('id', editingStaff.id)

        if (error) {
          showToast('Personel güncellenirken hata oluştu', 'error')
          console.error('Update error:', error)
        } else {
          showToast('Personel başarıyla güncellendi', 'success')
          setShowEditModal(false)
          setEditingStaff(null)
          loadStaff()
        }
      } else {
        // Create new staff
        const { error } = await supabase
          .from('staff')
          .insert({
            salon_id: salonId,
            full_name: capitalizeWords(formData.full_name),
            phone: formData.phone.trim() || null,
            work_start_time: formData.work_start_time.trim() || null,
            work_end_time: formData.work_end_time.trim() || null,
            created_by: profileId,
          })

        if (error) {
          showToast('Personel eklenirken hata oluştu', 'error')
          console.error('Insert error:', error)
        } else {
          showToast('Personel başarıyla eklendi', 'success')
          setShowAddModal(false)
          setFormData({ full_name: '', phone: '', work_start_time: '', work_end_time: '' })
          loadStaff()
        }
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!window.confirm(`"${staffName}" adlı personeli silmek istediğinizden emin misiniz?`)) {
      return
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (error) {
      showToast('Personel silinirken hata oluştu', 'error')
      console.error('Delete error:', error)
    } else {
      showToast('Personel başarıyla silindi', 'success')
      loadStaff()
    }
  }

  const handleToggleActive = async (staffMember: Staff) => {
    const { error } = await supabase
      .from('staff')
      .update({ is_active: !staffMember.is_active })
      .eq('id', staffMember.id)

    if (error) {
      showToast('Personel durumu güncellenirken hata oluştu', 'error')
      console.error('Toggle error:', error)
    } else {
      showToast(
        `Personel ${staffMember.is_active ? 'pasif' : 'aktif'} hale getirildi`,
        'success'
      )
      loadStaff()
    }
  }

  return (
    <>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Personel Yönetimi</h2>
            <p className="mt-1 text-sm text-gray-600">
              Salon personellerini ekleyin ve yönetin
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="today">Bugün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
            <Button 
              onClick={() => setShowPerformanceModal(true)} 
              size="sm"
              variant="secondary"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Performans Raporu
            </Button>
            <Button onClick={handleAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Personel Ekle
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
        ) : staff.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Henüz personel eklenmemiş</p>
            <Button onClick={handleAdd} className="mt-4" variant="secondary">
              İlk Personeli Ekle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((staffMember) => {
              const performance = performanceData.get(staffMember.id)
              const isExpanded = expandedStaff.has(staffMember.id)

              return (
                <div
                  key={staffMember.id}
                  className="rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{staffMember.full_name}</p>
                        {!staffMember.is_active && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            Pasif
                          </span>
                        )}
                      </div>
                      {staffMember.phone && (
                        <p className="mt-1 text-sm text-gray-600">{staffMember.phone}</p>
                      )}
                      {performance && (
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {performance.total_revenue.toFixed(2)} ₺
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {performance.invoice_count} Adisyon
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {performance.appointment_count} Randevu
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {performance && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePerformanceView(staffMember.id)}
                          className="text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="mr-1 h-3 w-3" />
                              Detayları Gizle
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 h-3 w-3" />
                              Performans Detayları
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(staffMember)}
                        className="text-xs"
                      >
                        {staffMember.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(staffMember)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(staffMember.id, staffMember.full_name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && performance && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Performans Detayları</h3>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-white p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span>Toplam Ciro</span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {performance.total_revenue.toFixed(2)} ₺
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <BarChart3 className="h-4 w-4" />
                            <span>Adisyon Sayısı</span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {performance.invoice_count}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Randevu Sayısı</span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {performance.appointment_count}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>Ortalama Adisyon</span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {performance.average_invoice.toFixed(2)} ₺
                          </p>
                        </div>
                      </div>
                      {performance.last_activity && (
                        <div className="mt-3 text-xs text-gray-600">
                          Son Aktivite: {new Date(performance.last_activity).toLocaleString('tr-TR')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Yeni Personel Ekle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Örn: Ahmet Yılmaz"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon (Opsiyonel)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-500">
                  +90
                </span>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData({ ...formData, phone: value })
                  }}
                  placeholder="5551234567"
                  className="pl-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Çalışma Başlangıç Saati (Opsiyonel)
                </label>
                <Input
                  type="time"
                  value={formData.work_start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, work_start_time: e.target.value })
                  }
                  placeholder="09:30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Çalışma Bitiş Saati (Opsiyonel)
                </label>
                <Input
                  type="time"
                  value={formData.work_end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, work_end_time: e.target.value })
                  }
                  placeholder="18:00"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowAddModal(false)}
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
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && editingStaff && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingStaff(null)
          }}
          title="Personel Düzenle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Örn: Ahmet Yılmaz"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon (Opsiyonel)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-500">
                  +90
                </span>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData({ ...formData, phone: value })
                  }}
                  placeholder="5551234567"
                  className="pl-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Çalışma Başlangıç Saati (Opsiyonel)
                </label>
                <Input
                  type="time"
                  value={formData.work_start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, work_start_time: e.target.value })
                  }
                  placeholder="09:30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Çalışma Bitiş Saati (Opsiyonel)
                </label>
                <Input
                  type="time"
                  value={formData.work_end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, work_end_time: e.target.value })
                  }
                  placeholder="18:00"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStaff(null)
                }}
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
        </Modal>
      )}

      {/* Performance Report Modal */}
      {showPerformanceModal && (
        <Modal
          isOpen={showPerformanceModal}
          onClose={() => setShowPerformanceModal(false)}
          title="Personel Performans Raporu"
        >
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarih Filtresi
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Son 30 Gün</option>
              </select>
            </div>

            {loadingPerformance ? (
              <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {staff
                  .filter(s => performanceData.has(s.id))
                  .sort((a, b) => {
                    const perfA = performanceData.get(a.id)!
                    const perfB = performanceData.get(b.id)!
                    return perfB.total_revenue - perfA.total_revenue
                  })
                  .map((staffMember) => {
                    const performance = performanceData.get(staffMember.id)!
                    return (
                      <Card key={staffMember.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{staffMember.full_name}</h3>
                            {!staffMember.is_active && (
                              <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                Pasif
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div className="rounded-lg bg-blue-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
                              <DollarSign className="h-4 w-4" />
                              <span>Toplam Ciro</span>
                            </div>
                            <p className="text-lg font-semibold text-blue-900">
                              {performance.total_revenue.toFixed(2)} ₺
                            </p>
                          </div>
                          <div className="rounded-lg bg-green-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
                              <BarChart3 className="h-4 w-4" />
                              <span>Adisyon</span>
                            </div>
                            <p className="text-lg font-semibold text-green-900">
                              {performance.invoice_count}
                            </p>
                          </div>
                          <div className="rounded-lg bg-purple-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-purple-600 mb-1">
                              <Calendar className="h-4 w-4" />
                              <span>Randevu</span>
                            </div>
                            <p className="text-lg font-semibold text-purple-900">
                              {performance.appointment_count}
                            </p>
                          </div>
                          <div className="rounded-lg bg-orange-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-orange-600 mb-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>Ortalama</span>
                            </div>
                            <p className="text-lg font-semibold text-orange-900">
                              {performance.average_invoice.toFixed(2)} ₺
                            </p>
                          </div>
                        </div>
                        {performance.last_activity && (
                          <div className="mt-3 text-xs text-gray-500">
                            Son Aktivite: {new Date(performance.last_activity).toLocaleString('tr-TR')}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                
                {staff.filter(s => performanceData.has(s.id)).length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p>Henüz performans verisi yok</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => setShowPerformanceModal(false)}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

