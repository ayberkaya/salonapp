'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Users, Plus, Edit2, Trash2, X, Save } from 'lucide-react'

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

  useEffect(() => {
    loadStaff()
  }, [])

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
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Personel Ekle
          </Button>
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
            {staff.map((staffMember) => (
              <div
                key={staffMember.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
              >
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
                </div>
                <div className="flex items-center gap-2">
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
            ))}
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
    </>
  )
}

