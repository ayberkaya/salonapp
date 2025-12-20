'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Scissors, Plus, Edit2, Trash2, X, Save, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react'

type ServiceCategory = {
  id: string
  salon_id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

type Service = {
  id: string
  salon_id: string
  name: string
  default_price: number
  is_active: boolean
  category_id: string | null
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
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    default_price: '',
    category_id: '',
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
  })
  const [saving, setSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadServices(), loadCategories()])
  }

  const loadServices = async () => {
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
  }

  const loadCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('salon_id', salonId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading categories:', JSON.stringify(error, null, 2))
      console.error('Error details:', error)
      // Check if table exists
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        showToast('Kategori tablosu bulunamadı. Lütfen migration\'ı çalıştırın.', 'error')
      } else {
        showToast('Kategori listesi yüklenirken hata oluştu', 'error')
      }
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: { [key: string]: Service[] } = {}
    const uncategorized: Service[] = []

    services.forEach((service) => {
      if (service.category_id) {
        if (!grouped[service.category_id]) {
          grouped[service.category_id] = []
        }
        grouped[service.category_id].push(service)
      } else {
        uncategorized.push(service)
      }
    })

    return { grouped, uncategorized }
  }, [services])

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null
    return categories.find((cat) => cat.id === categoryId)?.name || null
  }

  const handleAdd = () => {
    setFormData({ name: '', default_price: '', category_id: '' })
    setShowAddModal(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      default_price: service.default_price.toString(),
      category_id: service.category_id || '',
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
      const capitalizeWords = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      const updateData: any = {
        name: capitalizeWords(formData.name),
        default_price: price,
        category_id: formData.category_id || null,
      }

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(updateData)
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
        const { error } = await supabase.from('services').insert({
          salon_id: salonId,
          ...updateData,
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
          setFormData({ name: '', default_price: '', category_id: '' })
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

    const { error } = await supabase.from('services').delete().eq('id', serviceId)

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
      showToast(`Hizmet ${service.is_active ? 'pasif' : 'aktif'} hale getirildi`, 'success')
      loadServices()
    }
  }

  // Category management functions
  const handleAddCategory = () => {
    setCategoryFormData({ name: '' })
    setEditingCategory(null)
    setShowAddCategoryModal(true)
  }

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category)
    setCategoryFormData({ name: category.name })
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showToast('Kategori adı gereklidir', 'error')
      return
    }

    setSaving(true)
    try {
      const capitalizeWords = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('service_categories')
          .update({ name: capitalizeWords(categoryFormData.name) })
          .eq('id', editingCategory.id)

        if (error) {
          if (error.code === '23505') {
            const existingCategories = categories
              .filter(cat => cat.id !== editingCategory.id)
              .map(cat => cat.name.toLowerCase())
            const newCategoryName = capitalizeWords(categoryFormData.name).toLowerCase()
            
            if (existingCategories.includes(newCategoryName)) {
              showToast(`"${capitalizeWords(categoryFormData.name)}" kategorisi zaten mevcut. Lütfen farklı bir isim deneyin.`, 'error')
            } else {
              showToast(`"${capitalizeWords(categoryFormData.name)}" kategorisi zaten kullanılıyor olabilir. Lütfen sayfayı yenileyin ve tekrar deneyin.`, 'error')
              loadCategories()
            }
          } else {
            showToast('Kategori güncellenirken hata oluştu', 'error')
          }
          console.error('Update error:', JSON.stringify(error, null, 2))
        } else {
          showToast('Kategori başarıyla güncellendi', 'success')
          setShowCategoryModal(false)
          setEditingCategory(null)
          loadCategories()
        }
      } else {
        // Get max display_order for this salon
        const maxOrderResult = await supabase
          .from('service_categories')
          .select('display_order')
          .eq('salon_id', salonId)
          .order('display_order', { ascending: false })
          .limit(1)

        if (maxOrderResult.error) {
          console.error('Error getting max order:', JSON.stringify(maxOrderResult.error, null, 2))
          if (maxOrderResult.error.code === '42P01' || maxOrderResult.error.message?.includes('does not exist')) {
            showToast('Kategori tablosu bulunamadı. Lütfen migration\'ı çalıştırın.', 'error')
            setSaving(false)
            return
          }
        }

        const maxOrder = maxOrderResult.data?.[0]?.display_order ?? -1

        const categoryName = capitalizeWords(categoryFormData.name)
        console.log('Attempting to insert category:', { salon_id: salonId, name: categoryName, display_order: maxOrder + 1 })
        console.log('Current categories:', categories.map(c => c.name))

        // Check if category already exists (case-insensitive) before inserting
        const existingCategories = categories.map(cat => cat.name.toLowerCase())
        const newCategoryName = categoryName.toLowerCase()
        
        if (existingCategories.includes(newCategoryName)) {
          const existingCategory = categories.find(cat => cat.name.toLowerCase() === newCategoryName)
          showToast(`"${existingCategory?.name || categoryName}" kategorisi zaten mevcut.`, 'error')
          setSaving(false)
          return
        }

        const { data: insertData, error } = await supabase
          .from('service_categories')
          .insert({
            salon_id: salonId,
            name: categoryName,
            display_order: maxOrder + 1,
          })
          .select()

        if (error) {
          console.error('Insert error details:', JSON.stringify(error, null, 2))
          console.error('Error object:', error)
          console.error('Error message:', error.message)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          
          if (error.code === '23505') {
            // Unique constraint violation - reload categories and check again
            await loadCategories()
            const updatedCategories = await supabase
              .from('service_categories')
              .select('name')
              .eq('salon_id', salonId)
            
            if (updatedCategories.data) {
              const categoryNames = updatedCategories.data.map(c => c.name.toLowerCase())
              if (categoryNames.includes(newCategoryName)) {
                const foundCategory = updatedCategories.data.find(c => c.name.toLowerCase() === newCategoryName)
                showToast(`"${foundCategory?.name || categoryName}" kategorisi zaten mevcut. Lütfen sayfayı yenileyin.`, 'error')
              } else {
                showToast(`"${categoryName}" kategorisi eklenirken bir hata oluştu. Lütfen sayfayı yenileyin ve tekrar deneyin.`, 'error')
              }
            } else {
              showToast(`"${categoryName}" kategorisi zaten kullanılıyor olabilir. Lütfen sayfayı yenileyin.`, 'error')
            }
          } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            showToast('Bu işlem için yetkiniz yok. Lütfen salon sahibi olarak giriş yapın.', 'error')
          } else {
            showToast(
              `Kategori eklenirken hata oluştu: ${error.message || error.code || 'Bilinmeyen hata'}`,
              'error'
            )
          }
        } else {
          showToast('Kategori başarıyla eklendi', 'success')
          setShowAddCategoryModal(false)
          setCategoryFormData({ name: '' })
          loadCategories()
        }
      }
    } catch (err) {
      showToast('Beklenmeyen bir hata oluştu', 'error')
      console.error('Unexpected error:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    // Check if category has services
    const servicesInCategory = services.filter((s) => s.category_id === categoryId)
    if (servicesInCategory.length > 0) {
      showToast(
        'Bu kategori altında hizmetler bulunmaktadır. Önce hizmetleri başka bir kategoriye taşıyın veya silin.',
        'error'
      )
      return
    }

    if (!window.confirm(`"${categoryName}" adlı kategoriyi silmek istediğinizden emin misiniz?`)) {
      return
    }

    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      showToast('Kategori silinirken hata oluştu', 'error')
      console.error('Delete error:', error)
    } else {
      showToast('Kategori başarıyla silindi', 'success')
      loadCategories()
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
          <div className="flex gap-2">
            <Button onClick={handleAddCategory} size="sm" variant="secondary">
              <FolderOpen className="mr-2 h-4 w-4" />
              Kategori Ekle
            </Button>
            <Button onClick={handleAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Hizmet Ekle
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
        ) : (
          <div className="space-y-6">
            {/* Services grouped by category */}
            {categories.map((category) => {
              const categoryServices = servicesByCategory.grouped[category.id] || []
              if (categoryServices.length === 0) return null
              const isExpanded = expandedCategories.has(category.id)

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="space-y-2 pl-4">
                      {categoryServices.map((service) => (
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
                </div>
              )
            })}

            {/* Uncategorized services */}
            {servicesByCategory.uncategorized.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => toggleCategory('uncategorized')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity border-b border-gray-200 pb-2 w-full text-left"
                >
                  {expandedCategories.has('uncategorized') ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Kategorisiz</h3>
                </button>
                {expandedCategories.has('uncategorized') && (
                  <div className="space-y-2 pl-4">
                    {servicesByCategory.uncategorized.map((service) => (
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
              </div>
            )}

            {/* Empty state */}
            {services.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Scissors className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p>Henüz hizmet eklenmemiş</p>
                <Button onClick={handleAdd} className="mt-4" variant="secondary">
                  İlk Hizmeti Ekle
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add Service Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Yeni Hizmet Ekle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori <span className="text-gray-400">(Opsiyonel)</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Kategori Seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
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

      {/* Edit Service Modal */}
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
                Kategori <span className="text-gray-400">(Opsiyonel)</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Kategori Seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hizmet Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
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

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <Modal
          isOpen={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          title="Yeni Kategori Ekle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
                placeholder="Örn: Saç, Tırnak, Makyaj"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowAddCategoryModal(false)}
                className="flex-1"
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSaveCategory} className="flex-1" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Category Modal */}
      {showCategoryModal && editingCategory && (
        <Modal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
          title="Kategori Düzenle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
                placeholder="Örn: Saç, Tırnak, Makyaj"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                }}
                className="flex-1"
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSaveCategory} className="flex-1" disabled={saving}>
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
