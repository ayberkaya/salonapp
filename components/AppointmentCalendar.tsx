'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, startOfDay, setHours, setMinutes, isPast, isToday } from 'date-fns'
import { tr } from 'date-fns/locale/tr'

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
      color: string | null
    }
  }>
  appointment_services: Array<{
    service_id: string
    services: {
      name: string
    }
  }>
}

type Staff = {
  id: string
  full_name: string
  work_start_time: string | null
  work_end_time: string | null
  color: string | null
}

interface AppointmentCalendarProps {
  appointments: Appointment[]
  staffList: Staff[]
  openingTime?: string | null
  closingTime?: string | null
  onDateClick: (date: Date, staffId?: string) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export default function AppointmentCalendar({
  appointments,
  staffList,
  openingTime,
  closingTime,
  onDateClick,
  onAppointmentClick,
}: AppointmentCalendarProps) {
  const [viewType, setViewType] = useState<'month' | 'day'>('month')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [showOutsideHoursModal, setShowOutsideHoursModal] = useState(false)
  const [pendingClick, setPendingClick] = useState<{ date: Date; staffId?: string; staffName?: string } | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Monday

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.appointment_date), 'yyyy-MM-dd')
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(apt)
    })
    return map
  }, [appointments])

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return appointmentsByDate.get(dateKey) || []
  }

  // Get appointments for a specific day and hour
  const getAppointmentsForDayAndHour = (date: Date, hour: number, staffId?: string): Appointment[] => {
    const dayAppointments = getAppointmentsForDate(date)
    return dayAppointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date)
      const aptHour = aptDate.getHours()
      if (aptHour !== hour) return false
      
      if (staffId) {
        return apt.appointment_staff.some((as: any) => as.staff_id === staffId)
      }
      return true
    })
  }

  // Generate time slots based on salon opening/closing hours (default: 08:00 - 20:00)
  const timeSlots = useMemo(() => {
    const slots: Array<{ hour: number; minute: number }> = []
    
    // Parse opening and closing times
    let startHour = 8
    let startMinute = 0
    let endHour = 20
    let endMinute = 0
    
    if (openingTime) {
      const [hour, minute] = openingTime.split(':').map(Number)
      startHour = hour
      startMinute = minute || 0
    }
    
    if (closingTime) {
      const [hour, minute] = closingTime.split(':').map(Number)
      endHour = hour
      endMinute = minute || 0
    }
    
    // Calculate start and end in minutes from midnight
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // Generate slots in 30-minute intervals
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      slots.push({ hour, minute })
    }
    
    return slots
  }, [openingTime, closingTime])

  // Get all staff for the selected day - always show all staff so users can add appointments
  const getStaffForDay = (date: Date): Staff[] => {
    // Always return all staff so users can add appointments to any staff member
    // This allows adding appointments even when no appointments exist for that day
    return staffList
  }

  // Get time slots filtered by staff working hours and salon hours
  const getTimeSlotsForStaff = (staff: Staff | null): Array<{ hour: number; minute: number }> => {
    // First, filter by salon hours (timeSlots already filtered by salon hours)
    let availableSlots = timeSlots

    // Then, if staff has working hours, filter by staff hours
    if (staff && staff.work_start_time && staff.work_end_time) {
      // Parse staff working hours
      const [startHour, startMinute] = staff.work_start_time.split(':').map(Number)
      const [endHour, endMinute] = staff.work_end_time.split(':').map(Number)
      
      const startTime = startHour * 60 + (startMinute || 0)
      const endTime = endHour * 60 + (endMinute || 0)

      // Filter time slots within staff working hours
      availableSlots = availableSlots.filter(slot => {
        const slotTime = slot.hour * 60 + slot.minute
        return slotTime >= startTime && slotTime < endTime
      })
    }

    return availableSlots
  }

  const prevDay = () => {
    setSelectedDay(addDays(selectedDay, -1))
  }

  const nextDay = () => {
    setSelectedDay(addDays(selectedDay, 1))
  }

  const handleDayClick = (day: Date) => {
    if (viewType === 'month') {
      setSelectedDay(day)
      setViewType('day')
    } else {
      onDateClick(day, undefined)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-800 border-yellow-300'
      case 'CONFIRMED':
        return 'text-blue-800 border-blue-300'
      case 'COMPLETED':
        return 'text-green-800 border-green-300'
      case 'CANCELLED':
        return 'text-red-800 border-red-300'
      default:
        return 'text-gray-800 border-gray-300'
    }
  }

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const today = new Date()
  const isTodayDate = (date: Date) => isSameDay(date, today)
  const isPastDate = (date: Date) => {
    const dateStart = startOfDay(date)
    const todayStart = startOfDay(today)
    return dateStart < todayStart
  }

  const dayStaff = viewType === 'day' ? getStaffForDay(selectedDay) : []

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
          {viewType === 'month' ? (
            <>
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-black" />
              </button>
              <h2 className="text-base sm:text-xl font-semibold text-gray-900 text-center sm:text-left flex-1 sm:flex-initial">
                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
              </h2>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-black" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={prevDay}
                className="rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-black" />
              </button>
              <h2 className="text-sm sm:text-xl font-semibold text-gray-900 text-center sm:text-left flex-1 sm:flex-initial">
                {format(selectedDay, 'd MMMM yyyy', { locale: tr })}
              </h2>
              <button
                onClick={nextDay}
                className="rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-black" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {/* View Type Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setViewType('month')}
              className={`flex items-center justify-center gap-1 sm:gap-2 rounded px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                viewType === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Aylık</span>
              <span className="sm:hidden">Ay</span>
            </button>
            <button
              onClick={() => {
                setViewType('day')
                setSelectedDay(new Date())
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 rounded px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                viewType === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="hidden sm:inline">Günlük</span>
              <span className="sm:hidden">Gün</span>
            </button>
          </div>
          <button
            onClick={() => {
              const today = new Date()
              setCurrentMonth(today)
              setSelectedDay(today)
            }}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 sm:px-0"
          >
            Bugün
          </button>
        </div>
      </div>

      {/* Month View */}
      {viewType === 'month' && (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Week Day Headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((day, dayIdx) => {
            const dayAppointments = getAppointmentsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDay = isTodayDate(day)
            const isPast = isPastDate(day)

            return (
              <div
                key={dayIdx}
                className={`
                  min-h-[60px] sm:min-h-[100px] border-2 rounded-lg p-1 sm:p-2 transition-all
                  ${isCurrentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}
                  ${isTodayDay ? 'border-blue-400 bg-blue-50' : ''}
                  ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300 hover:bg-blue-50'}
                `}
                onClick={() => {
                  if (isPast) {
                    return // Geçmiş tarihlere tıklamayı engelle
                  }
                  if (viewType === 'month') {
                    setSelectedDay(day)
                    setViewType('day')
                  } else {
                    onDateClick(day, undefined)
                  }
                }}
              >
                <div
                  className={`
                    text-sm font-medium mb-1
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isTodayDay ? 'text-blue-600 font-bold' : ''}
                    ${isPast ? 'text-gray-400' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => {
                    // Get staff color from appointment - use first staff member's color
                    const staffColor = apt.appointment_staff && apt.appointment_staff.length > 0
                      ? apt.appointment_staff[0].staff?.color || null
                      : null
                    
                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick(apt)
                        }}
                        className={`
                          text-xs px-1.5 py-0.5 rounded border truncate
                          ${getStatusColor(apt.status)}
                          hover:opacity-80 cursor-pointer
                        `}
                        style={{
                          backgroundColor: staffColor || undefined,
                        }}
                        title={`${apt.customers?.full_name || 'Bilinmeyen'} - ${format(new Date(apt.appointment_date), 'HH:mm')}`}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="truncate">
                            {format(new Date(apt.appointment_date), 'HH:mm')}
                          </span>
                        </div>
                        <div className="truncate font-medium">
                          {apt.customers?.full_name || 'Bilinmeyen'}
                        </div>
                      </div>
                    )
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{dayAppointments.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Day View */}
      {viewType === 'day' && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full px-4 sm:px-0">
            <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${Math.max(dayStaff.length, 1)}, 1fr)` }}>
              {/* Top-left corner */}
              <div className="bg-gray-50 border border-gray-200 rounded-tl-lg p-1 sm:p-2"></div>
              
              {/* Staff Headers */}
              {dayStaff.length > 0 ? (
                dayStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="border border-gray-200 p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-700"
                    style={{
                      backgroundColor: staff.color || '#f9fafb',
                    }}
                  >
                    {staff.full_name}
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border border-gray-200 p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-700">
                  Personel Yok
                </div>
              )}

              {/* Time slots and appointments */}
              {(() => {
                // Always show all salon hours (timeSlots already filtered by salon opening/closing times)
                // Staff-specific filtering happens in individual cells
                const slotsToShow = timeSlots

                return slotsToShow.map((timeSlot) => {
                  const timeDate = setMinutes(setHours(startOfDay(selectedDay), timeSlot.hour), timeSlot.minute)
                  return (
                    <div key={`${timeSlot.hour}-${timeSlot.minute}`} className="contents">
                      {/* Time label */}
                      <div className="bg-gray-50 border border-gray-200 p-1 sm:p-2 text-xs sm:text-sm font-medium text-gray-700 text-right pr-2 sm:pr-3">
                        {format(timeDate, 'HH:mm')}
                      </div>
                      
                      {/* Appointment cells for each staff */}
                      {dayStaff.length > 0 ? (
                        dayStaff.map((staff) => {
                          // Check if this time slot is within staff working hours
                          const staffTimeSlots = getTimeSlotsForStaff(staff)
                          const isInWorkingHours = staffTimeSlots.some(s => s.hour === timeSlot.hour && s.minute === timeSlot.minute)
                          
                          // Show gray cell if outside staff working hours, but still allow interaction
                          // (salon hours are always shown, staff hours are just visual indication)
                          if (!isInWorkingHours && staff.work_start_time && staff.work_end_time) {
                            const clickDate = setMinutes(setHours(startOfDay(selectedDay), timeSlot.hour), timeSlot.minute)
                            const isPastTime = clickDate < new Date()
                            
                            return (
                              <div
                                key={staff.id}
                                className={`border border-gray-200 p-1 min-h-[30px] bg-gray-100 opacity-60 ${
                                  isPastTime ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200'
                                }`}
                                onClick={() => {
                                  if (isPastTime) {
                                    return
                                  }
                                  // Show confirmation modal before proceeding
                                  setPendingClick({
                                    date: clickDate,
                                    staffId: staff.id,
                                    staffName: staff.full_name
                                  })
                                  setShowOutsideHoursModal(true)
                                }}
                                title="Personel çalışma saatleri dışında"
                              />
                            )
                          }

                          // Get appointments that start in this time slot
                          const slotAppointments = getAppointmentsForDate(selectedDay).filter((apt) => {
                            const aptDate = new Date(apt.appointment_date)
                            const aptHour = aptDate.getHours()
                            const aptMinutes = aptDate.getMinutes()
                            
                            // Check if appointment starts in this time slot (exact match required)
                            // Randevu sadece başladığı slot'ta gösterilmeli
                            if (aptHour !== timeSlot.hour || aptMinutes !== timeSlot.minute) {
                              return false
                            }
                            
                            // Check if appointment has this staff
                            if (staff.id) {
                              return apt.appointment_staff.some((as: any) => as.staff_id === staff.id)
                            }
                            return true
                          })
                          
                          const clickDate = setMinutes(setHours(startOfDay(selectedDay), timeSlot.hour), timeSlot.minute)
                          const isPastTime = clickDate < new Date()

                          return (
                            <div
                              key={staff.id}
                              className={`border border-gray-200 p-1 min-h-[30px] relative transition-colors overflow-hidden ${
                                isPastTime 
                                  ? 'bg-gray-50 opacity-50 cursor-not-allowed' 
                                  : 'bg-white hover:bg-gray-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                if (isPastTime) {
                                  return // Geçmiş saatlere tıklamayı engelle
                                }
                                onDateClick(clickDate, staff.id)
                              }}
                            >
                            {slotAppointments.map((apt) => {
                              const aptDate = new Date(apt.appointment_date)
                              const duration = apt.duration_minutes || 60
                              // Randevu sadece kendi slot'unda görünsün, diğer slotlara kaymasın
                              const slotHeight = 30 // Her slot 30px yüksekliğinde
                              
                              // Get staff color from appointment - use first staff member's color
                              const staffColor = apt.appointment_staff && apt.appointment_staff.length > 0
                                ? apt.appointment_staff[0].staff?.color || null
                                : null
                              
                              return (
                                <div
                                  key={apt.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onAppointmentClick(apt)
                                  }}
                                  className={`
                                    ${getStatusColor(apt.status)}
                                    rounded p-1.5 mb-1 text-xs cursor-pointer hover:opacity-90 absolute left-1 right-1 z-10
                                  `}
                                  style={{
                                    top: '2px',
                                    height: `${slotHeight - 4}px`,
                                    maxHeight: `${slotHeight - 4}px`,
                                    overflow: 'hidden',
                                    backgroundColor: staffColor || undefined,
                                  }}
                                  title={`${apt.customers?.full_name || 'Bilinmeyen'} - ${format(aptDate, 'HH:mm')} (${duration} dk)`}
                                >
                                  <div className="font-medium truncate">
                                    {apt.customers?.full_name || 'Bilinmeyen'}
                                  </div>
                                  <div className="text-xs opacity-80">
                                    {format(aptDate, 'HH:mm')}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })
                    ) : (
                      (() => {
                        const clickDate = setMinutes(setHours(startOfDay(selectedDay), timeSlot.hour), timeSlot.minute)
                        const isPastTime = clickDate < new Date()
                        
                        return (
                          <div
                            className={`border border-gray-200 p-1 min-h-[30px] relative transition-colors overflow-hidden ${
                              isPastTime 
                                ? 'bg-gray-50 opacity-50 cursor-not-allowed' 
                                : 'bg-white hover:bg-gray-50 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (isPastTime) {
                                return // Geçmiş saatlere tıklamayı engelle
                              }
                              onDateClick(clickDate, undefined)
                            }}
                          >
                        {/* Show appointments without staff */}
                        {getAppointmentsForDate(selectedDay).filter((apt) => {
                          const aptDate = new Date(apt.appointment_date)
                          const aptHour = aptDate.getHours()
                          const aptMinutes = aptDate.getMinutes()
                          
                          // Check if appointment starts in this time slot
                          return aptHour === timeSlot.hour && aptMinutes === timeSlot.minute
                        }).map((apt) => {
                          const aptDate = new Date(apt.appointment_date)
                          const duration = apt.duration_minutes || 60
                          // Randevu sadece kendi slot'unda görünsün, diğer slotlara kaymasın
                          const slotHeight = 30 // Her slot 30px yüksekliğinde
                          
                          // Get staff color from appointment - use first staff member's color
                          const staffColor = apt.appointment_staff && apt.appointment_staff.length > 0
                            ? apt.appointment_staff[0].staff?.color || null
                            : null
                          
                          return (
                            <div
                              key={apt.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onAppointmentClick(apt)
                              }}
                              className={`
                                ${getStatusColor(apt.status)}
                                rounded p-1.5 mb-1 text-xs cursor-pointer hover:opacity-90 absolute left-1 right-1 z-10
                              `}
                              style={{
                                top: '2px',
                                height: `${slotHeight - 4}px`,
                                maxHeight: `${slotHeight - 4}px`,
                                overflow: 'hidden',
                                backgroundColor: staffColor || undefined,
                              }}
                              title={`${apt.customers?.full_name || 'Bilinmeyen'} - ${format(aptDate, 'HH:mm')} (${duration} dk)`}
                            >
                              <div className="font-medium truncate">
                                {apt.customers?.full_name || 'Bilinmeyen'}
                              </div>
                              <div className="text-xs opacity-80">
                                {format(aptDate, 'HH:mm')}
                              </div>
                            </div>
                          )
                        })}
                        </div>
                        )
                      })()
                    )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border bg-yellow-100 border-yellow-300"></div>
          <span className="text-gray-600">Beklemede</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border bg-blue-100 border-blue-300"></div>
          <span className="text-gray-600">Onaylandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border bg-green-100 border-green-300"></div>
          <span className="text-gray-600">Tamamlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border bg-red-100 border-red-300"></div>
          <span className="text-gray-600">İptal</span>
        </div>
      </div>

      {/* Outside Working Hours Confirmation Modal */}
      <Modal
        isOpen={showOutsideHoursModal}
        onClose={() => {
          setShowOutsideHoursModal(false)
          setPendingClick(null)
        }}
        title="Personel Çalışma Saatleri Dışında"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                {pendingClick?.staffName ? (
                  <>
                    <strong>{pendingClick.staffName}</strong> personelinin çalışma saatleri dışında randevu eklemek istiyorsunuz.
                  </>
                ) : (
                  <>Personel çalışma saatleri dışında randevu eklemek istiyorsunuz.</>
                )}
              </p>
              {pendingClick && (
                <p className="mt-2 text-sm text-gray-600">
                  <strong>Tarih:</strong> {format(pendingClick.date, 'd MMMM yyyy, HH:mm', { locale: tr })}
                </p>
              )}
              <p className="mt-3 text-sm font-medium text-gray-900">
                Devam etmek istediğinizden emin misiniz?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowOutsideHoursModal(false)
                setPendingClick(null)
              }}
            >
              İptal
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (pendingClick) {
                  onDateClick(pendingClick.date, pendingClick.staffId)
                }
                setShowOutsideHoursModal(false)
                setPendingClick(null)
              }}
            >
              Evet, Devam Et
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

