'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Scissors, Plus, Edit2, Trash2, X, Save } from 'lucide-react'

type Service = {
  id: string
  salon_id: string
  name: string
  default_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ServiceManagementProps {
  salonId: string
  profileId: string
}

export default function ServiceManagement({ salonId, profileId }: ServiceManagementProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    default_price: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salonId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading services:', error)
      showToast('Hizmet listesi yüklenirken hata oluştu', 'error')
    } else {
      setServices(data || [])
    }
    setLoading(false)
  }

  const handleAdd = () => {
    setFormData({ name: '', default_price: '' })
    setShowAddModal(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      default_price: service.default_price.toString(),
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Hizmet adı gereklidir', 'error')
      return
    }

    const price = parseFloat(formData.default_price)
    if (isNaN(price) || price < 0) {
      showToast('Geçerli bir fiyat girin', 'error')
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

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: capitalizeWords(formData.name),
            default_price: price,
          })
          .eq('id', editingService.id)

        if (error) {
          if (error.code === '23505') {
            showToast('Bu hizmet adı zaten kullanılıyor', 'error')
          } else {
            showToast('Hizmet güncellenirken hata oluştu', 'error')
          }
          console.error('Update error:', error)
        } else {
          showToast('Hizmet başarıyla güncellendi', 'success')
          setShowEditModal(false)
          setEditingService(null)
          loadServices()
        }
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert({
            salon_id: salonId,
            name: capitalizeWords(formData.name),
            default_price: price,
            is_active: true,
          })

        if (error) {
          if (error.code === '23505') {
            showToast('Bu hizmet adı zaten kullanılıyor', 'error')
          } else {
            showToast('Hizmet eklenirken hata oluştu', 'error')
          }
          console.error('Insert error:', error)
        } else {
          showToast('Hizmet başarıyla eklendi', 'success')
          setShowAddModal(false)
          setFormData({ name: '', default_price: '' })
          loadServices()
        }
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (!window.confirm(`"${serviceName}" adlı hizmeti silmek istediğinizden emin misiniz?`)) {
      return
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      showToast('Hizmet silinirken hata oluştu', 'error')
      console.error('Delete error:', error)
    } else {
      showToast('Hizmet başarıyla silindi', 'success')
      loadServices()
    }
  }

  const handleToggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)

    if (error) {
      showToast('Hizmet durumu güncellenirken hata oluştu', 'error')
      console.error('Toggle error:', error)
    } else {
      showToast(
        `Hizmet ${service.is_active ? 'pasif' : 'aktif'} hale getirildi`,
        'success'
      )
      loadServices()
    }
  }

  return (
    <>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Hizmet Yönetimi</h2>
            <p className="mt-1 text-sm text-gray-600">
              Salon hizmetlerini ve fiyatlarını ekleyin ve yönetin
            </p>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Hizmet Ekle
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
        ) : services.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Scissors className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Henüz hizmet eklenmemiş</p>
            <Button onClick={handleAdd} className="mt-4" variant="secondary">
              İlk Hizmeti Ekle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50"
                style={{ padding: '9.6px' }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    {!service.is_active && (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {service.default_price.toFixed(2)} ₺
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(service)}
                    className="text-xs"
                  >
                    {service.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id, service.name)}
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
          title="Yeni Hizmet Ekle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Örn: Kesim, Fön, Boya"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Varsayılan Fiyat (₺) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.default_price}
                onChange={(e) =>
                  setFormData({ ...formData, default_price: e.target.value })
                }
                placeholder="0.00"
              />
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
      {showEditModal && editingService && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingService(null)
          }}
          title="Hizmet Düzenle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Örn: Kesim, Fön, Boya"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Varsayılan Fiyat (₺) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.default_price}
                onChange={(e) =>
                  setFormData({ ...formData, default_price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingService(null)
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

