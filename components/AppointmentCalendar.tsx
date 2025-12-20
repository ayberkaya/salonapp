'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
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

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onDateClick: (date: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export default function AppointmentCalendar({
  appointments,
  onDateClick,
  onAppointmentClick,
}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

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
  const isToday = (date: Date) => isSameDay(date, today)

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        </div>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Bugün
        </button>
      </div>

      {/* Calendar Grid */}
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
          const isTodayDate = isToday(day)

          return (
            <div
              key={dayIdx}
              className={`
                min-h-[100px] border-2 rounded-lg p-2 cursor-pointer transition-all
                ${isCurrentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}
                ${isTodayDate ? 'border-blue-400 bg-blue-50' : ''}
                hover:border-blue-300 hover:bg-blue-50
              `}
              onClick={() => onDateClick(day)}
            >
              <div
                className={`
                  text-sm font-medium mb-1
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isTodayDate ? 'text-blue-600 font-bold' : ''}
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

