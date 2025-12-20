'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Save, Lock, Building2, Clock, Calendar, ChevronDown, ChevronUp, Award } from 'lucide-react'

type Salon = {
  id: string
  name: string
  working_days: string[] | null
  opening_time: string | null
  closing_time: string | null
  loyalty_bronze_discount: number | null
  loyalty_silver_discount: number | null
  loyalty_gold_discount: number | null
  loyalty_platinum_discount: number | null
  loyalty_vip_discount: number | null
  loyalty_silver_min_visits: number | null
  loyalty_gold_min_visits: number | null
  loyalty_platinum_min_visits: number | null
  loyalty_vip_min_visits: number | null
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
  const [loyaltyBronzeDiscount, setLoyaltyBronzeDiscount] = useState(10)
  const [loyaltySilverDiscount, setLoyaltySilverDiscount] = useState(15)
  const [loyaltyGoldDiscount, setLoyaltyGoldDiscount] = useState(20)
  const [loyaltyPlatinumDiscount, setLoyaltyPlatinumDiscount] = useState(25)
  const [loyaltyVipDiscount, setLoyaltyVipDiscount] = useState(30)
  const [loyaltySilverMinVisits, setLoyaltySilverMinVisits] = useState(10)
  const [loyaltyGoldMinVisits, setLoyaltyGoldMinVisits] = useState(20)
  const [loyaltyPlatinumMinVisits, setLoyaltyPlatinumMinVisits] = useState(30)
  const [loyaltyVipMinVisits, setLoyaltyVipMinVisits] = useState(40)
  const [savingSalon, setSavingSalon] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showSalonSection, setShowSalonSection] = useState(false)
  const [showLoyaltySection, setShowLoyaltySection] = useState(false)

  useEffect(() => {
    if (salon) {
      setSalonName(salon.name || '')
      setWorkingDays(salon.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
      setOpeningTime(salon.opening_time || '09:00')
      setClosingTime(salon.closing_time || '18:00')
      setLoyaltyBronzeDiscount(salon.loyalty_bronze_discount ?? 10)
      setLoyaltySilverDiscount(salon.loyalty_silver_discount ?? 15)
      setLoyaltyGoldDiscount(salon.loyalty_gold_discount ?? 20)
      setLoyaltyPlatinumDiscount(salon.loyalty_platinum_discount ?? 25)
      setLoyaltyVipDiscount(salon.loyalty_vip_discount ?? 30)
      setLoyaltySilverMinVisits(salon.loyalty_silver_min_visits ?? 10)
      setLoyaltyGoldMinVisits(salon.loyalty_gold_min_visits ?? 20)
      setLoyaltyPlatinumMinVisits(salon.loyalty_platinum_min_visits ?? 30)
      setLoyaltyVipMinVisits(salon.loyalty_vip_min_visits ?? 40)
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
          loyalty_bronze_discount: loyaltyBronzeDiscount,
          loyalty_silver_discount: loyaltySilverDiscount,
          loyalty_gold_discount: loyaltyGoldDiscount,
          loyalty_platinum_discount: loyaltyPlatinumDiscount,
          loyalty_vip_discount: loyaltyVipDiscount,
          loyalty_silver_min_visits: loyaltySilverMinVisits,
          loyalty_gold_min_visits: loyaltyGoldMinVisits,
          loyalty_platinum_min_visits: loyaltyPlatinumMinVisits,
          loyalty_vip_min_visits: loyaltyVipMinVisits,
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

      {/* Loyalty Discount Settings */}
      <Card className="p-3">
        <button
          onClick={() => setShowLoyaltySection(!showLoyaltySection)}
          className="w-full flex items-center justify-between h-10"
        >
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Sadakat Seviyesi İndirimleri</h2>
          </div>
          {showLoyaltySection ? (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          )}
        </button>
        {showLoyaltySection && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 mb-4">
              Her sadakat seviyesi için indirim oranını ve minimum ziyaret sayısını belirleyin
            </p>
            
            <div className="space-y-6">
              {/* Bronze Level */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🥉</span> Bronz Seviyesi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltyBronzeDiscount}
                      onChange={(e) => setLoyaltyBronzeDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={savingSalon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Ziyaret (Her zaman 0)
                    </label>
                    <Input
                      type="number"
                      value={0}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Silver Level */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🥈</span> Gümüş Seviyesi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltySilverDiscount}
                      onChange={(e) => setLoyaltySilverDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={savingSalon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Ziyaret Sayısı
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={loyaltySilverMinVisits}
                      onChange={(e) => setLoyaltySilverMinVisits(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={savingSalon}
                    />
                  </div>
                </div>
              </div>

              {/* Gold Level */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🥇</span> Altın Seviyesi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltyGoldDiscount}
                      onChange={(e) => setLoyaltyGoldDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={savingSalon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Ziyaret Sayısı
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={loyaltyGoldMinVisits}
                      onChange={(e) => setLoyaltyGoldMinVisits(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={savingSalon}
                    />
                  </div>
                </div>
              </div>

              {/* Platinum Level */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">💎</span> Platin Seviyesi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltyPlatinumDiscount}
                      onChange={(e) => setLoyaltyPlatinumDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={savingSalon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Ziyaret Sayısı
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={loyaltyPlatinumMinVisits}
                      onChange={(e) => setLoyaltyPlatinumMinVisits(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={savingSalon}
                    />
                  </div>
                </div>
              </div>

              {/* VIP Level */}
              <div className="pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">👑</span> VIP Seviyesi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltyVipDiscount}
                      onChange={(e) => setLoyaltyVipDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={savingSalon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Ziyaret Sayısı
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={loyaltyVipMinVisits}
                      onChange={(e) => setLoyaltyVipMinVisits(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={savingSalon}
                    />
                  </div>
                </div>
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

