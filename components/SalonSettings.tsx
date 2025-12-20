'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Save, Lock, Building2, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

type Salon = {
  id: string
  name: string
  working_days: string[] | null
  opening_time: string | null
  closing_time: string | null
}

interface SalonSettingsProps {
  salonId: string
  initialSalon: Salon | null
}

const weekDays = [
  { value: 'Monday', label: 'Pazartesi' },
  { value: 'Tuesday', label: 'Salı' },
  { value: 'Wednesday', label: 'Çarşamba' },
  { value: 'Thursday', label: 'Perşembe' },
  { value: 'Friday', label: 'Cuma' },
  { value: 'Saturday', label: 'Cumartesi' },
  { value: 'Sunday', label: 'Pazar' },
]

export default function SalonSettings({ salonId, initialSalon }: SalonSettingsProps) {
  const supabase = createClient()
  const { showToast } = useToast()

  const [salon, setSalon] = useState<Salon | null>(initialSalon)
  const [salonName, setSalonName] = useState('')
  const [workingDays, setWorkingDays] = useState<string[]>([])
  const [openingTime, setOpeningTime] = useState('')
  const [closingTime, setClosingTime] = useState('')
  const [savingSalon, setSavingSalon] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showSalonSection, setShowSalonSection] = useState(false)

  useEffect(() => {
    if (salon) {
      setSalonName(salon.name || '')
      setWorkingDays(salon.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
      setOpeningTime(salon.opening_time || '09:00')
      setClosingTime(salon.closing_time || '18:00')
    }
  }, [salon])

  const handleToggleDay = (day: string) => {
    setWorkingDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      } else {
        return [...prev, day]
      }
    })
  }

  const handleSaveSalonSettings = async () => {
    if (!salonName.trim()) {
      showToast('Salon ismi gereklidir', 'error')
      return
    }

    if (workingDays.length === 0) {
      showToast('En az bir çalışma günü seçmelisiniz', 'error')
      return
    }

    if (!openingTime || !closingTime) {
      showToast('Açılış ve kapanış saatleri gereklidir', 'error')
      return
    }

    setSavingSalon(true)
    try {
      console.log('Updating salon with:', {
        salonId,
        name: salonName.trim(),
        working_days: workingDays,
        opening_time: openingTime,
        closing_time: closingTime,
      })

      const { data: updateData, error } = await supabase
        .from('salons')
        .update({
          name: salonName.trim(),
          working_days: workingDays,
          opening_time: openingTime || null,
          closing_time: closingTime || null,
        })
        .eq('id', salonId)
        .select()

      if (error) {
        showToast('Salon ayarları güncellenirken hata oluştu', 'error')
        console.error('Update error:', error)
      } else {
        console.log('Update successful, data:', updateData)
        showToast('Salon ayarları başarıyla güncellendi', 'success')
        // Reload salon data
        const { data } = await supabase
          .from('salons')
          .select('*')
          .eq('id', salonId)
          .single()
        if (data) {
          console.log('Reloaded salon data:', data)
          setSalon(data as Salon)
          // Update local state to reflect saved values
          setOpeningTime(data.opening_time || '')
          setClosingTime(data.closing_time || '')
        }
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setSavingSalon(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Tüm alanları doldurun', 'error')
      return
    }

    if (newPassword.length < 6) {
      showToast('Yeni şifre en az 6 karakter olmalıdır', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('Yeni şifreler eşleşmiyor', 'error')
      return
    }

    setChangingPassword(true)
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        showToast('Kullanıcı bulunamadı', 'error')
        setChangingPassword(false)
        return
      }

      // Get email from auth
      const email = user.email
      if (!email) {
        showToast('Email bulunamadı', 'error')
        setChangingPassword(false)
        return
      }

      // Save current session
      const { data: { session } } = await supabase.auth.getSession()

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        showToast('Mevcut şifre yanlış', 'error')
        setChangingPassword(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        showToast('Şifre güncellenirken hata oluştu', 'error')
        console.error('Update password error:', updateError)
        // Restore session if update failed
        if (session) {
          await supabase.auth.setSession(session)
        }
      } else {
        showToast('Şifre başarıyla güncellendi', 'success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card className="p-3">
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="w-full flex items-center justify-between h-10"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Şifre Değiştir</h2>
          </div>
          {showPasswordSection ? (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          )}
        </button>
        {showPasswordSection && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mevcut Şifre <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifrenizi girin"
                disabled={changingPassword}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifrenizi girin (en az 6 karakter)"
                disabled={changingPassword}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre Tekrar <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
                disabled={changingPassword}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {changingPassword ? 'Şifre değiştiriliyor...' : 'Şifreyi Değiştir'}
            </Button>
          </div>
        )}
      </Card>

      {/* Salon Settings */}
      <Card className="p-3">
        <button
          onClick={() => setShowSalonSection(!showSalonSection)}
          className="w-full flex items-center justify-between h-10"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Salon Bilgileri</h2>
          </div>
          {showSalonSection ? (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          )}
        </button>
        {showSalonSection && (
          <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salon İsmi <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Salon ismini girin"
              disabled={savingSalon}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              Çalışma Günleri <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weekDays.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={workingDays.includes(day.value)}
                    onChange={() => handleToggleDay(day.value)}
                    disabled={savingSalon}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Açılış Saati <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                disabled={savingSalon}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Kapanış Saati <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                disabled={savingSalon}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSalonSettings}
            disabled={savingSalon}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {savingSalon ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

