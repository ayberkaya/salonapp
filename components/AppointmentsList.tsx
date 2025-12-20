'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Calendar, Clock, User, Scissors, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import AppointmentModal from '@/components/AppointmentModal'

type Profile = Database['public']['Tables']['profiles']['Row']

type Appointment = {
  id: string
  appointment_date: string
  duration_minutes: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  customers: {
    full_name: string
    phone: string
  }
  appointment_staff: Array<{
    staff_id: string
    staff: {
      full_name: string
    }
  }>
  appointment_services: Array<{
    service_id: string
    services: {
      name: string
    }
  }>
}

interface AppointmentsListProps {
  profile: Profile
}

export default function AppointmentsList({ profile }: AppointmentsListProps) {
  const supabase = createClient()
  const { showToast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    loadAppointments()
  }, [dateFilter, statusFilter])

  const loadAppointments = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customers (full_name, phone),
          appointment_staff (
            staff_id,
            staff (full_name)
          ),
          appointment_services (
            service_id,
            services (name)
          )
        `)
        .eq('salon_id', profile.salon_id)

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        let endDate: Date

        if (dateFilter === 'today') {
          startDate = new Date(now.setHours(0, 0, 0, 0))
          endDate = new Date(now.setHours(23, 59, 59, 999))
        } else if (dateFilter === 'week') {
          startDate = new Date(now.setDate(now.getDate() - 7))
          endDate = new Date()
        } else if (dateFilter === 'month') {
          startDate = new Date(now.setDate(now.getDate() - 30))
          endDate = new Date()
        }

        query = query
          .gte('appointment_date', startDate!.toISOString())
          .lte('appointment_date', endDate!.toISOString())
      }

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query.order('appointment_date', { ascending: true })

      if (error) {
        console.error('Error loading appointments:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        
        // If junction tables don't exist yet, try without them
        if (error.code === 'PGRST116' || error.message?.includes('appointment_staff') || error.message?.includes('appointment_services')) {
          console.warn('Junction tables not found, loading appointments without staff/services')
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('appointments')
            .select(`
              *,
              customers (full_name, phone)
            `)
            .eq('salon_id', profile.salon_id)
            .order('appointment_date', { ascending: true })
          
          if (fallbackError) {
            showToast('Randevular yüklenirken hata oluştu', 'error')
            setAppointments([])
          } else {
            // Map to expected format
            const mappedData = (fallbackData || []).map((apt: any) => ({
              ...apt,
              appointment_staff: [],
              appointment_services: []
            }))
            setAppointments(mappedData)
          }
        } else {
          showToast('Randevular yüklenirken hata oluştu', 'error')
          setAppointments([])
        }
      } else {
        setAppointments(data || [])
      }
    } catch (err) {
      console.error('Unexpected error loading appointments:', err)
      showToast('Randevular yüklenirken beklenmeyen bir hata oluştu', 'error')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (appointmentId: string) => {
    if (!window.confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
      return
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('salon_id', profile.salon_id)

    if (error) {
      console.error('Error deleting appointment:', error)
      showToast('Randevu silinirken hata oluştu', 'error')
    } else {
      showToast('Randevu başarıyla silindi', 'success')
      loadAppointments()
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .eq('salon_id', profile.salon_id)

    if (error) {
      console.error('Error updating appointment status:', error)
      showToast('Randevu durumu güncellenirken hata oluştu', 'error')
    } else {
      showToast('Randevu durumu güncellendi', 'success')
      loadAppointments()
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Beklemede</Badge>
      case 'CONFIRMED':
        return <Badge variant="default">Onaylandı</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Tamamlandı</Badge>
      case 'CANCELLED':
        return <Badge variant="error">İptal</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Randevular</h1>
          <p className="mt-1 text-gray-600">Randevuları görüntüleyin ve yönetin</p>
        </div>
        <Button onClick={() => {
          setEditingAppointment(null)
          setShowAppointmentModal(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Randevu
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Zamanlar</option>
            <option value="today">Bugün</option>
            <option value="week">Son 7 Gün</option>
            <option value="month">Son 30 Gün</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="PENDING">Beklemede</option>
            <option value="CONFIRMED">Onaylandı</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </div>
      </Card>

      {/* Appointments List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Randevu Listesi</h2>
        {loading ? (
          <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
        ) : appointments.length === 0 ? (
          <EmptyState
            title="Randevu bulunamadı"
            description="Henüz randevu oluşturulmamış"
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(appointment.status)}
                      <span className="text-xs text-gray-500">
                        {formatDate(appointment.appointment_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.customers?.full_name || 'Bilinmeyen Müşteri'}
                        </p>
                      </div>
                      {appointment.appointment_staff && appointment.appointment_staff.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Scissors className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {appointment.appointment_staff.map((as: any) => as.staff?.full_name).filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                      {appointment.appointment_services && appointment.appointment_services.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {appointment.appointment_services.map((as: any) => as.services?.name).filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                    {appointment.notes && (
                      <p className="text-xs text-gray-600 mt-2">{appointment.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {appointment.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')}
                        title="Onayla"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
                        title="İptal Et"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                    {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAppointment(appointment)
                          setShowAppointmentModal(true)
                        }}
                        title="Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(appointment.id)}
                      title="Sil"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false)
          setEditingAppointment(null)
          loadAppointments()
        }}
        salonId={profile.salon_id}
        profileId={profile.id}
        appointment={editingAppointment ? {
          id: editingAppointment.id,
          appointment_date: editingAppointment.appointment_date,
          duration_minutes: editingAppointment.duration_minutes,
          status: editingAppointment.status,
          notes: editingAppointment.notes,
          customers: editingAppointment.customers,
        } : null}
      />
    </div>
  )
}

