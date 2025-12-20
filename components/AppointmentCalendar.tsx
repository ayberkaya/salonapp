'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
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

  // Get all unique staff from appointments for the selected day
  // If no appointments have staff, show all staff
  const getStaffForDay = (date: Date): Staff[] => {
    const dayAppointments = getAppointmentsForDate(date)
    const staffMap = new Map<string, Staff>()
    
    dayAppointments.forEach(apt => {
      apt.appointment_staff.forEach((as: any) => {
        if (as.staff_id && as.staff?.full_name) {
          if (!staffMap.has(as.staff_id)) {
            // Find staff from staffList to get working hours
            const staffFromList = staffList.find(s => s.id === as.staff_id)
            staffMap.set(as.staff_id, {
              id: as.staff_id,
              full_name: as.staff.full_name,
              work_start_time: staffFromList?.work_start_time || null,
              work_end_time: staffFromList?.work_end_time || null
            })
          }
        }
      })
    })
    
    // If no staff in appointments, show all staff
    if (staffMap.size === 0 && staffList.length > 0) {
      return staffList
    }
    
    // If we have staff from appointments, return them
    if (staffMap.size > 0) {
      return Array.from(staffMap.values())
    }
    
    // If no staff at all, return empty array
    return []
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
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
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {viewType === 'month' ? (
            <>
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
              </h2>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={prevDay}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(selectedDay, 'd MMMM yyyy', { locale: tr })}
              </h2>
              <button
                onClick={nextDay}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View Type Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setViewType('month')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewType === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => {
                setViewType('day')
                setSelectedDay(new Date())
              }}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewType === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Günlük
            </button>
          </div>
          <button
            onClick={() => {
              const today = new Date()
              setCurrentMonth(today)
              setSelectedDay(today)
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Bugün
          </button>
        </div>
      </div>

      {/* Month View */}
      {viewType === 'month' && (
        <div className="grid grid-cols-7 gap-2">
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
                  min-h-[100px] border-2 rounded-lg p-2 transition-all
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
                  {dayAppointments.slice(0, 3).map((apt) => (
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
                  ))}
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
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${Math.max(dayStaff.length, 1)}, 1fr)` }}>
              {/* Top-left corner */}
              <div className="bg-gray-50 border border-gray-200 rounded-tl-lg p-2"></div>
              
              {/* Staff Headers */}
              {dayStaff.length > 0 ? (
                dayStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="bg-gray-50 border border-gray-200 p-2 text-center text-sm font-semibold text-gray-700"
                  >
                    {staff.full_name}
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border border-gray-200 p-2 text-center text-sm font-semibold text-gray-700">
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
                      <div className="bg-gray-50 border border-gray-200 p-2 text-sm font-medium text-gray-700 text-right pr-3">
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
                                  onDateClick(clickDate, staff.id)
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
                            
                            // Check if appointment starts in this time slot
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
                              className={`border border-gray-200 p-1 min-h-[30px] relative transition-colors ${
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
                              const heightInSlots = Math.ceil(duration / 30)
                              
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
                                    height: `${heightInSlots * 30 - 4}px`,
                                  }}
                                  title={`${apt.customers?.full_name || 'Bilinmeyen'} - ${format(aptDate, 'HH:mm')}`}
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
                            className={`border border-gray-200 p-1 min-h-[30px] relative transition-colors ${
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
                          const heightInSlots = Math.ceil(duration / 30)
                          
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
                                height: `${heightInSlots * 30 - 4}px`,
                              }}
                              title={`${apt.customers?.full_name || 'Bilinmeyen'} - ${format(aptDate, 'HH:mm')}`}
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
    </Card>
  )
}

