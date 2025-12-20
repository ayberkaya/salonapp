'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { smsProvider } from '@/lib/sms'
import { useToast } from '@/lib/toast-context'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { Calendar, Clock, Users, MessageSquare, Plus, Edit2, Trash2, Send, Save, X } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type Customer = Database['public']['Tables']['customers']['Row']
type CampaignTemplate = {
  id: string
  salon_id: string
  name: string
  message: string
  campaign_type: 'MANUAL' | 'BIRTHDAY' | 'ANNIVERSARY' | 'INACTIVE' | 'CUSTOM'
  created_by: string
  created_at: string
  updated_at: string
}
type Campaign = {
  id: string
  salon_id: string
  name: string
  message: string
  campaign_type: 'MANUAL' | 'BIRTHDAY' | 'ANNIVERSARY' | 'INACTIVE' | 'SCHEDULED' | 'AUTOMATIC'
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED'
  scheduled_at: string | null
  sent_at: string | null
  created_by: string
  template_id: string | null
  created_at: string
  updated_at: string
}

interface CampaignsViewProps {
  profile: Profile
  inactiveCustomers: Customer[]
  topCustomers: Array<{ customer: Customer; count: number }>
}

export default function CampaignsView({
  profile,
  inactiveCustomers,
  topCustomers,
}: CampaignsViewProps) {
  const { showToast } = useToast()
  const supabase = createClient()
  
  // State management
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'scheduled' | 'history'>('create')
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [campaignMessage, setCampaignMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [sending, setSending] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [templateType, setTemplateType] = useState<'MANUAL' | 'BIRTHDAY' | 'ANNIVERSARY' | 'INACTIVE' | 'CUSTOM'>('MANUAL')
  
  // Data state
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignStats, setCampaignStats] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)

  // Load templates and campaigns
  useEffect(() => {
    loadTemplates()
    loadCampaigns()
  }, [])

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTemplates(data as CampaignTemplate[])
    }
  }

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setCampaigns(data as Campaign[])
      // Load stats for all campaigns (sent and scheduled)
      loadCampaignStats(data as Campaign[])
    }
  }

  const loadCampaignStats = async (campaignsToLoad: Campaign[]) => {
    if (campaignsToLoad.length === 0) return

    setLoadingStats(true)
    const statsMap = new Map()

    for (const campaign of campaignsToLoad) {
      const { data: recipients, error } = await supabase
        .from('campaign_recipients')
        .select('status')
        .eq('campaign_id', campaign.id)

      if (!error && recipients) {
        const stats = {
          total: recipients.length,
          sent: recipients.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'OPENED').length,
          delivered: recipients.filter((r) => r.status === 'DELIVERED' || r.status === 'OPENED').length,
          opened: recipients.filter((r) => r.status === 'OPENED').length,
          failed: recipients.filter((r) => r.status === 'FAILED').length,
        }
        statsMap.set(campaign.id, stats)
      }
    }

    setCampaignStats(statsMap)
    setLoadingStats(false)
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomers)
    if (newSet.has(customerId)) {
      newSet.delete(customerId)
    } else {
      newSet.add(customerId)
    }
    setSelectedCustomers(newSet)
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === inactiveCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(inactiveCustomers.map((c) => c.id)))
    }
  }

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template.id)
    setCampaignMessage(template.message)
    setTemplateType(template.campaign_type)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) {
      showToast('Lütfen şablon adı ve mesajını doldurun', 'error')
      return
    }

    setLoading(true)
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('campaign_templates')
          .update({
            name: templateName,
            message: templateMessage,
            campaign_type: templateType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id)

        if (error) throw error
        showToast('Şablon güncellendi', 'success')
      } else {
        const { error } = await supabase
          .from('campaign_templates')
          .insert({
            salon_id: profile.salon_id,
            name: templateName,
            message: templateMessage,
            campaign_type: templateType,
            created_by: profile.id,
          })

        if (error) throw error
        showToast('Şablon kaydedildi', 'success')
      }

      setShowTemplateModal(false)
      setEditingTemplate(null)
      setTemplateName('')
      setTemplateMessage('')
      setTemplateType('MANUAL')
      loadTemplates()
    } catch (error) {
      showToast('Şablon kaydedilirken hata oluştu', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('campaign_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      showToast('Şablon silinirken hata oluştu', 'error')
    } else {
      showToast('Şablon silindi', 'success')
      loadTemplates()
    }
  }

  const handleEditTemplate = (template: CampaignTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateMessage(template.message)
    setTemplateType(template.campaign_type)
    setShowTemplateModal(true)
  }

  const handleSendCampaign = async () => {
    if (selectedCustomers.size === 0 || !campaignMessage.trim()) {
      return
    }

    setSending(true)
    const selected = inactiveCustomers.filter((c) => selectedCustomers.has(c.id))
    const campaignNameFinal = campaignName.trim() || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`

    try {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          salon_id: profile.salon_id,
          name: campaignNameFinal,
          message: campaignMessage,
          campaign_type: 'MANUAL',
          status: 'SENDING',
          created_by: profile.id,
          template_id: selectedTemplate,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Create recipient records and send messages
      const recipients = selected.map((customer) => ({
        campaign_id: campaign.id,
        customer_id: customer.id,
        phone: customer.phone,
        status: 'PENDING',
      }))

      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(recipients)

      if (recipientsError) throw recipientsError

      // Send SMS messages
      let sentCount = 0
      let failedCount = 0

      for (const customer of selected) {
        try {
          await smsProvider.sendCampaign(customer.phone, campaignMessage)
          
          await supabase
            .from('campaign_recipients')
            .update({
              status: 'SENT',
              sent_at: new Date().toISOString(),
            })
            .eq('campaign_id', campaign.id)
            .eq('customer_id', customer.id)

          sentCount++
        } catch (error) {
          await supabase
            .from('campaign_recipients')
            .update({
              status: 'FAILED',
              error_message: 'SMS gönderilemedi',
            })
            .eq('campaign_id', campaign.id)
            .eq('customer_id', customer.id)

          failedCount++
        }
      }

      // Update campaign status
      await supabase
        .from('campaigns')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaign.id)

      setSending(false)
      setSelectedCustomers(new Set())
      setCampaignMessage('')
      setCampaignName('')
      setSelectedTemplate(null)
      setShowConfirmModal(false)
      
      if (failedCount > 0) {
        showToast(`${sentCount} müşteriye gönderildi, ${failedCount} başarısız`, 'success')
      } else {
        showToast(`Kampanya ${sentCount} müşteriye gönderildi`, 'success')
      }

      loadCampaigns()
    } catch (error) {
      setSending(false)
      showToast('Kampanya gönderilirken hata oluştu', 'error')
      console.error(error)
    }
  }

  const handleScheduleCampaign = async () => {
    if (selectedCustomers.size === 0 || !campaignMessage.trim() || !scheduledDate || !scheduledTime) {
      showToast('Lütfen tüm alanları doldurun', 'error')
      return
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    if (scheduledDateTime < new Date()) {
      showToast('Geçmiş bir tarih seçemezsiniz', 'error')
      return
    }

    setSending(true)
    const selected = inactiveCustomers.filter((c) => selectedCustomers.has(c.id))
    const campaignNameFinal = campaignName.trim() || `Zamanlanmış Kampanya ${scheduledDateTime.toLocaleDateString('tr-TR')}`

    try {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          salon_id: profile.salon_id,
          name: campaignNameFinal,
          message: campaignMessage,
          campaign_type: 'SCHEDULED',
          status: 'SCHEDULED',
          scheduled_at: scheduledDateTime.toISOString(),
          created_by: profile.id,
          template_id: selectedTemplate,
        })
        .select()
        .single()

      if (error) throw error

      const recipients = selected.map((customer) => ({
        campaign_id: campaign.id,
        customer_id: customer.id,
        phone: customer.phone,
        status: 'PENDING',
      }))

      await supabase
        .from('campaign_recipients')
        .insert(recipients)

      setSending(false)
      setSelectedCustomers(new Set())
      setCampaignMessage('')
      setCampaignName('')
      setScheduledDate('')
      setScheduledTime('')
      setSelectedTemplate(null)
      setShowConfirmModal(false)
      
      showToast('Kampanya zamanlandı', 'success')
      loadCampaigns()
    } catch (error) {
      setSending(false)
      showToast('Kampanya zamanlanırken hata oluştu', 'error')
      console.error(error)
    }
  }

  const getStatusBadge = (status: Campaign['status']) => {
    const variants: Record<Campaign['status'], 'default' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      SCHEDULED: 'warning',
      SENDING: 'warning',
      SENT: 'success',
      CANCELLED: 'error',
    }
    const labels: Record<Campaign['status'], string> = {
      DRAFT: 'Taslak',
      SCHEDULED: 'Zamanlandı',
      SENDING: 'Gönderiliyor',
      SENT: 'Gönderildi',
      CANCELLED: 'İptal',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SMS Kampanyaları</h1>
        <p className="mt-2 text-gray-600">
          Kampanyalar oluşturun, şablonlar yönetin ve performansı takip edin
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="mr-2 inline h-4 w-4" />
            Yeni Kampanya
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Save className="mr-2 inline h-4 w-4" />
            Şablonlar
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'scheduled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Clock className="mr-2 inline h-4 w-4" />
            Zamanlanmış
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Calendar className="mr-2 inline h-4 w-4" />
            Geçmiş
          </button>
        </nav>
      </div>

      {/* Create Campaign Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inactive Customers */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Pasif Müşteriler (30+ gün)
                </h2>
                {inactiveCustomers.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedCustomers.size === inactiveCustomers.length
                      ? 'Seçimi Kaldır'
                      : 'Tümünü Seç'}
                  </Button>
                )}
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {inactiveCustomers.length === 0 ? (
                  <EmptyState
                    title="Pasif müşteri yok"
                    description="Tüm müşteriler aktif görünüyor"
                  />
                ) : (
                  inactiveCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{customer.full_name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                        {customer.last_visit_at && (
                          <p className="text-xs text-gray-500">
                            Son ziyaret: {new Date(customer.last_visit_at).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Templates */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Şablonlar</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null)
                    setTemplateName('')
                    setTemplateMessage('')
                    setTemplateType('MANUAL')
                    setShowTemplateModal(true)
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Yeni Şablon
                </Button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {templates.length === 0 ? (
                  <EmptyState
                    title="Şablon yok"
                    description="Yeni şablon oluşturmak için butona tıklayın"
                  />
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{template.message}</p>
                          <Badge variant="default" className="mt-2">
                            {template.campaign_type}
                          </Badge>
                        </div>
                        <div className="ml-2 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditTemplate(template)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTemplate(template.id)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Campaign Composer */}
          {selectedCustomers.size > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Kampanya Oluştur ({selectedCustomers.size} seçili)
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Kampanya Adı (Opsiyonel)
                  </label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Kampanya adı..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Mesaj
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Kampanya mesajınızı yazın..."
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    maxLength={160}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    {campaignMessage.length}/160 karakter
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!campaignMessage.trim()}
                    size="lg"
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Hemen Gönder
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const now = new Date()
                      const tomorrow = new Date(now)
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(10, 0, 0, 0)
                      setScheduledDate(tomorrow.toISOString().split('T')[0])
                      setScheduledTime('10:00')
                      setShowConfirmModal(true)
                    }}
                    disabled={!campaignMessage.trim()}
                    size="lg"
                    className="flex-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Zamanla
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Mesaj Şablonları</h2>
            <Button
              onClick={() => {
                setEditingTemplate(null)
                setTemplateName('')
                setTemplateMessage('')
                setTemplateType('MANUAL')
                setShowTemplateModal(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Şablon
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="Henüz şablon yok"
                  description="Sık kullandığınız mesajları şablon olarak kaydedin"
                />
              </div>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{template.message}</p>
                  <Badge variant="default">{template.campaign_type}</Badge>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Scheduled Campaigns Tab */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Zamanlanmış Kampanyalar</h2>
          <div className="space-y-3">
            {campaigns.filter((c) => c.status === 'SCHEDULED').length === 0 ? (
              <EmptyState
                title="Zamanlanmış kampanya yok"
                description="Henüz zamanlanmış kampanya bulunmuyor"
              />
            ) : (
              campaigns
                .filter((c) => c.status === 'SCHEDULED')
                .map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">{campaign.message}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <Clock className="mr-1 inline h-3 w-3" />
                            {campaign.scheduled_at
                              ? new Date(campaign.scheduled_at).toLocaleString('tr-TR')
                              : '-'}
                          </span>
                          <span>
                            <Users className="mr-1 inline h-3 w-3" />
                            {campaignStats.get(campaign.id)?.total || 0} alıcı
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </Card>
                ))
            )}
          </div>
        </div>
      )}

      {/* Campaign History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Kampanya Geçmişi</h2>
          <div className="space-y-3">
            {campaigns.filter((c) => c.status === 'SENT').length === 0 ? (
              <EmptyState
                title="Henüz kampanya gönderilmedi"
                description="Gönderilen kampanyalar burada görünecek"
              />
            ) : (
              campaigns
                .filter((c) => c.status === 'SENT')
                .map((campaign) => {
                  const stats = campaignStats.get(campaign.id)
                  return (
                    <Card key={campaign.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{campaign.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <span>
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {campaign.sent_at
                                ? new Date(campaign.sent_at).toLocaleString('tr-TR')
                                : '-'}
                            </span>
                            <span>
                              <Users className="mr-1 inline h-3 w-3" />
                              {campaign.campaign_type}
                            </span>
                            {stats && (
                              <>
                                <span className="text-green-600">
                                  ✓ {stats.sent}/{stats.total} gönderildi
                                </span>
                                {stats.failed > 0 && (
                                  <span className="text-red-600">
                                    ✗ {stats.failed} başarısız
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {stats && stats.total > 0 && (
                            <div className="mt-3 flex gap-2">
                              <div className="flex-1 rounded-lg bg-gray-100 p-2">
                                <div className="text-xs text-gray-600">Gönderildi</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {stats.sent}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {Math.round((stats.sent / stats.total) * 100)}%
                                </div>
                              </div>
                              {stats.delivered > 0 && (
                                <div className="flex-1 rounded-lg bg-blue-50 p-2">
                                  <div className="text-xs text-gray-600">Teslim Edildi</div>
                                  <div className="text-lg font-semibold text-blue-900">
                                    {stats.delivered}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round((stats.delivered / stats.total) * 100)}%
                                  </div>
                                </div>
                              )}
                              {stats.opened > 0 && (
                                <div className="flex-1 rounded-lg bg-green-50 p-2">
                                  <div className="text-xs text-gray-600">Açıldı</div>
                                  <div className="text-lg font-semibold text-green-900">
                                    {stats.opened}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round((stats.opened / stats.total) * 100)}%
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {getStatusBadge(campaign.status)}
                      </div>
                    </Card>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowConfirmModal(false)}
          title={scheduledDate && scheduledTime ? 'Kampanyayı Zamanla' : 'Kampanyayı Gönder'}
        >
          <div className="space-y-4">
            {scheduledDate && scheduledTime ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tarih
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Saat
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {selectedCustomers.size} müşteriye kampanya zamanlanacak. Devam etmek istiyor musunuz?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowConfirmModal(false)
                      setScheduledDate('')
                      setScheduledTime('')
                    }}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleScheduleCampaign}
                    disabled={sending || !scheduledDate || !scheduledTime}
                    className="flex-1"
                  >
                    {sending ? 'Zamanlanıyor...' : 'Zamanla'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600">
                  {selectedCustomers.size} müşteriye kampanya gönderilecek. Devam etmek istiyor musunuz?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleSendCampaign}
                    disabled={sending}
                    className="flex-1"
                  >
                    {sending ? 'Gönderiliyor...' : 'Gönder'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowTemplateModal(false)
            setEditingTemplate(null)
            setTemplateName('')
            setTemplateMessage('')
            setTemplateType('MANUAL')
          }}
          title={editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon'}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Şablon Adı
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Örn: Pasif Müşteri Hatırlatma"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mesaj Tipi
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MANUAL">Manuel</option>
                <option value="BIRTHDAY">Doğum Günü</option>
                <option value="ANNIVERSARY">Yıldönümü</option>
                <option value="INACTIVE">Pasif Müşteri</option>
                <option value="CUSTOM">Özel</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mesaj
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Mesajınızı yazın..."
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                maxLength={160}
              />
              <p className="mt-2 text-sm text-gray-500">
                {templateMessage.length}/160 karakter
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                  setTemplateName('')
                  setTemplateMessage('')
                  setTemplateType('MANUAL')
                }}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={loading || !templateName.trim() || !templateMessage.trim()}
                className="flex-1"
              >
                {loading ? 'Kaydediliyor...' : editingTemplate ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
