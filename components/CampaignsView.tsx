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
import { Calendar, Clock, Users, MessageSquare, Plus, Edit2, Trash2, Send, Save, X, Tag } from 'lucide-react'

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
type DiscountCode = {
  id: string
  salon_id: string
  code_name: string
  discount_percentage: number
  valid_from: string
  valid_until: string
  customer_id: string | null
  max_usage: number | null
  usage_count: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  customers?: { full_name: string; phone: string } | null
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
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'scheduled' | 'history' | 'discounts'>('create')
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
  
  // New campaign flow state
  const [messageType, setMessageType] = useState<'manual' | 'template' | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  
  // Data state
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignStats, setCampaignStats] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)

  // Discount codes state
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [loadingDiscountCodes, setLoadingDiscountCodes] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null)
  const [discountFormData, setDiscountFormData] = useState({
    code_name: '',
    discount_percentage: 10,
    valid_from: '',
    valid_until: '',
    customer_id: '',
    max_usage: '',
    is_active: true,
  })
  const [customerSearch, setCustomerSearch] = useState('')
  const [discountCustomers, setDiscountCustomers] = useState<Customer[]>([])
  const [selectedDiscountCustomer, setSelectedDiscountCustomer] = useState<Customer | null>(null)

  // Load templates and campaigns
  useEffect(() => {
    loadTemplates()
    loadCampaigns()
    if (activeTab === 'discounts') {
      loadDiscountCodes()
    }
  }, [activeTab])

  // Search customers for discount code
  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomersForDiscount(customerSearch)
    } else {
      setDiscountCustomers([])
    }
  }, [customerSearch])

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

  const loadDiscountCodes = async () => {
    setLoadingDiscountCodes(true)
    const { data, error } = await supabase
      .from('discount_codes')
      .select(`
        *,
        customers:customer_id (
          full_name,
          phone
        )
      `)
      .eq('salon_id', profile.salon_id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDiscountCodes(data.map((item: any) => ({
        ...item,
        customers: Array.isArray(item.customers) ? item.customers[0] : item.customers,
      })) as DiscountCode[])
    }
    setLoadingDiscountCodes(false)
  }

  const searchCustomersForDiscount = async (search: string) => {
    if (search.length < 2) {
      setDiscountCustomers([])
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(10)

    if (!error && data) {
      setDiscountCustomers(data)
    }
  }

  const handleSaveDiscountCode = async () => {
    if (!discountFormData.code_name.trim()) {
      showToast('Kod ismi gereklidir', 'error')
      return
    }

    if (discountFormData.discount_percentage <= 0 || discountFormData.discount_percentage > 100) {
      showToast('İndirim oranı 1-100 arasında olmalıdır', 'error')
      return
    }

    if (!discountFormData.valid_from || !discountFormData.valid_until) {
      showToast('Geçerlilik tarihleri gereklidir', 'error')
      return
    }

    const validFrom = new Date(discountFormData.valid_from)
    const validUntil = new Date(discountFormData.valid_until)

    if (validUntil <= validFrom) {
      showToast('Bitiş tarihi başlangıç tarihinden sonra olmalıdır', 'error')
      return
    }

    const discountData: any = {
      salon_id: profile.salon_id,
      code_name: discountFormData.code_name.trim(),
      discount_percentage: discountFormData.discount_percentage,
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
      customer_id: selectedDiscountCustomer?.id || null,
      max_usage: discountFormData.max_usage ? parseInt(discountFormData.max_usage) : null,
      is_active: discountFormData.is_active,
      created_by: profile.id,
    }

    if (editingDiscount) {
      const { error } = await supabase
        .from('discount_codes')
        .update(discountData)
        .eq('id', editingDiscount.id)

      if (error) {
        showToast('İndirim kodu güncellenirken hata oluştu', 'error')
        console.error('Update error:', error)
      } else {
        showToast('İndirim kodu başarıyla güncellendi', 'success')
        setShowDiscountModal(false)
        setEditingDiscount(null)
        loadDiscountCodes()
      }
    } else {
      const { error } = await supabase
        .from('discount_codes')
        .insert(discountData)

      if (error) {
        showToast('İndirim kodu oluşturulurken hata oluştu', 'error')
        console.error('Insert error:', error)
      } else {
        showToast('İndirim kodu başarıyla oluşturuldu', 'success')
        setShowDiscountModal(false)
        resetDiscountForm()
        loadDiscountCodes()
      }
    }
  }

  const handleDeleteDiscountCode = async (id: string) => {
    if (!window.confirm('Bu indirim kodunu silmek istediğinizden emin misiniz?')) {
      return
    }

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id)

    if (error) {
      showToast('İndirim kodu silinirken hata oluştu', 'error')
    } else {
      showToast('İndirim kodu başarıyla silindi', 'success')
      loadDiscountCodes()
    }
  }

  const resetDiscountForm = () => {
    setDiscountFormData({
      code_name: '',
      discount_percentage: 10,
      valid_from: '',
      valid_until: '',
      customer_id: '',
      max_usage: '',
      is_active: true,
    })
    setSelectedDiscountCustomer(null)
    setCustomerSearch('')
    setDiscountCustomers([])
  }

  const handleEditDiscount = (discount: DiscountCode) => {
    setEditingDiscount(discount)
    setDiscountFormData({
      code_name: discount.code_name,
      discount_percentage: discount.discount_percentage,
      valid_from: new Date(discount.valid_from).toISOString().split('T')[0],
      valid_until: new Date(discount.valid_until).toISOString().split('T')[0],
      customer_id: discount.customer_id || '',
      max_usage: discount.max_usage?.toString() || '',
      is_active: discount.is_active,
    })
    if (discount.customers) {
      setSelectedDiscountCustomer({
        id: discount.customer_id || '',
        full_name: discount.customers.full_name,
        phone: discount.customers.phone,
      } as Customer)
      setCustomerSearch(discount.customers.full_name)
    }
    setShowDiscountModal(true)
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
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)))
    }
  }

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template.id)
    setCampaignMessage(template.message)
    setTemplateType(template.campaign_type)
  }

  const handleMessageTypeSelect = (type: 'manual' | 'template') => {
    setMessageType(type)
    if (type === 'template' && templates.length > 0) {
      handleTemplateSelect(templates[0])
    }
  }

  const handleFilterChange = async (filterType: string) => {
    setSelectedFilter(filterType)
    setLoadingCustomers(true)
    setSelectedCustomers(new Set())

    try {
      let customers: Customer[] = []

      switch (filterType) {
        case 'inactive_30':
          // 30 gündür gelmeyenler
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const { data: inactive } = await supabase
            .from('customers')
            .select('*')
            .eq('salon_id', profile.salon_id)
            .or(`last_visit_at.is.null,last_visit_at.lt.${thirtyDaysAgo.toISOString()}`)
            .order('last_visit_at', { ascending: true, nullsFirst: true })
          customers = inactive || []
          break

        case 'this_week':
          // Bu hafta gelenler
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          weekStart.setHours(0, 0, 0, 0)
          const { data: thisWeek } = await supabase
            .from('customers')
            .select('*')
            .eq('salon_id', profile.salon_id)
            .gte('last_visit_at', weekStart.toISOString())
            .order('last_visit_at', { ascending: false })
          customers = thisWeek || []
          break

        case 'visit_4_of_5':
          // 5 ziyaret kampanyasından 4'ünü doldurmuş olanlar (4-5 ziyaret arası)
          const { data: visits } = await supabase
            .from('visits')
            .select('customer_id, customers(*)')
            .eq('salon_id', profile.salon_id)

          if (visits) {
            const visitCounts = new Map<string, { customer: Customer; count: number }>()
            visits.forEach((visit: any) => {
              const customerId = visit.customer_id
              const customer = Array.isArray(visit.customers)
                ? (visit.customers[0] as unknown as Customer)
                : (visit.customers as unknown as Customer)
              if (customer) {
                if (visitCounts.has(customerId)) {
                  visitCounts.get(customerId)!.count++
                } else {
                  visitCounts.set(customerId, { customer, count: 1 })
                }
              }
            })

            customers = Array.from(visitCounts.values())
              .filter((item) => item.count >= 4 && item.count < 5)
              .map((item) => item.customer)
          }
          break

        case 'all':
          // Tüm müşteriler
          const { data: all } = await supabase
            .from('customers')
            .select('*')
            .eq('salon_id', profile.salon_id)
            .order('created_at', { ascending: false })
          customers = all || []
          break

        default:
          customers = []
      }

      setFilteredCustomers(customers)
    } catch (error) {
      console.error('Error loading filtered customers:', error)
      showToast('Müşteriler yüklenirken hata oluştu', 'error')
    } finally {
      setLoadingCustomers(false)
    }
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
    const selected = filteredCustomers.filter((c) => selectedCustomers.has(c.id))
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
    const selected = filteredCustomers.filter((c) => selectedCustomers.has(c.id))
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
          <button
            onClick={() => setActiveTab('discounts')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'discounts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Tag className="mr-2 inline h-4 w-4" />
            İndirim Kodları
          </button>
        </nav>
      </div>

      {/* Create Campaign Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Step 1: Message Selection */}
          {!messageType && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Mesaj Seçimi</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => handleMessageTypeSelect('manual')}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-8 transition-all hover:border-blue-500 hover:bg-blue-50"
                >
                  <MessageSquare className="mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">Manuel Yaz</h3>
                  <p className="text-sm text-gray-600">Kampanya mesajınızı kendiniz yazın</p>
                </button>
                <button
                  onClick={() => handleMessageTypeSelect('template')}
                  disabled={templates.length === 0}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-8 transition-all hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">Şablon Seç</h3>
                  <p className="text-sm text-gray-600">
                    {templates.length === 0 ? 'Henüz şablon yok' : `${templates.length} şablon mevcut`}
                  </p>
                </button>
              </div>
            </Card>
          )}

          {/* Step 2: Message Input/Template Selection */}
          {messageType && (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {messageType === 'manual' ? 'Mesaj Yaz' : 'Şablon Seç'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMessageType(null)
                    setCampaignMessage('')
                    setSelectedTemplate(null)
                    setSelectedFilter(null)
                    setFilteredCustomers([])
                    setSelectedCustomers(new Set())
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Geri
                </Button>
              </div>

              {messageType === 'manual' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Mesaj</label>
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Şablon Seç</label>
                    <select
                      value={selectedTemplate || ''}
                      onChange={(e) => {
                        const template = templates.find((t) => t.id === e.target.value)
                        if (template) {
                          handleTemplateSelect(template)
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Şablon seçiniz...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTemplate && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">{campaignMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {campaignMessage.trim() && (
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      // Message is ready, show filter selection
                      setSelectedFilter(null)
                      setFilteredCustomers([])
                    }}
                    className="w-full"
                    size="lg"
                  >
                    Devam Et
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Step 3: Customer Filter Selection */}
          {messageType && campaignMessage.trim() && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Müşteri Filtreleme</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Filtre Seç</label>
                  <select
                    value={selectedFilter || ''}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Filtre seçiniz...</option>
                    <option value="inactive_30">30 gündür gelmeyenler</option>
                    <option value="this_week">Bu hafta gelenler</option>
                    <option value="visit_4_of_5">5 ziyaret kampanyasından 4'ünü doldurmuş olanlar</option>
                    <option value="all">Tüm müşteriler</option>
                  </select>
                </div>

                {loadingCustomers && (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  </div>
                )}

                {selectedFilter && !loadingCustomers && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {filteredCustomers.length} müşteri bulundu
                      </p>
                      {filteredCustomers.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedCustomers.size === filteredCustomers.length) {
                              setSelectedCustomers(new Set())
                            } else {
                              setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)))
                            }
                          }}
                        >
                          {selectedCustomers.size === filteredCustomers.length
                            ? 'Seçimi Kaldır'
                            : 'Tümünü Seç'}
                        </Button>
                      )}
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <EmptyState
                        title="Müşteri bulunamadı"
                        description="Seçilen filtreye uygun müşteri bulunmuyor"
                      />
                    ) : (
                      <div className="max-h-96 space-y-2 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
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
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 4: Campaign Composer */}
          {selectedCustomers.size > 0 && campaignMessage.trim() && (
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

      {/* Discount Codes Tab */}
      {activeTab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">İndirim Kodları</h2>
            <Button onClick={() => {
              resetDiscountForm()
              setShowDiscountModal(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni İndirim Kodu
            </Button>
          </div>

          {loadingDiscountCodes ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : discountCodes.length === 0 ? (
            <EmptyState
              title="Henüz indirim kodu yok"
              description="Müşterilerinize özel indirim kodları oluşturun"
            />
          ) : (
            <div className="space-y-3">
              {discountCodes.map((code) => {
                const now = new Date()
                const validFrom = new Date(code.valid_from)
                const validUntil = new Date(code.valid_until)
                const isExpired = now > validUntil
                const isNotStarted = now < validFrom
                const isValid = !isExpired && !isNotStarted && code.is_active

                return (
                  <Card key={code.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{code.code_name}</h3>
                          {isValid ? (
                            <Badge variant="success">Aktif</Badge>
                          ) : isExpired ? (
                            <Badge variant="error">Süresi Dolmuş</Badge>
                          ) : isNotStarted ? (
                            <Badge variant="warning">Başlamadı</Badge>
                          ) : (
                            <Badge variant="error">Pasif</Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium text-blue-600">%{code.discount_percentage} İndirim</span>
                          <span>
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {new Date(code.valid_from).toLocaleDateString('tr-TR')} - {new Date(code.valid_until).toLocaleDateString('tr-TR')}
                          </span>
                          {code.customers && (
                            <span>
                              <Users className="mr-1 inline h-3 w-3" />
                              {code.customers.full_name}
                            </span>
                          )}
                          {code.max_usage && (
                            <span>
                              Kullanım: {code.usage_count}/{code.max_usage}
                            </span>
                          )}
                          {!code.max_usage && code.usage_count > 0 && (
                            <span>
                              Kullanım: {code.usage_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDiscount(code)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDiscountCode(code.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
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

      {/* Discount Code Modal */}
      {showDiscountModal && (
        <Modal
          isOpen={showDiscountModal}
          onClose={() => {
            setShowDiscountModal(false)
            setEditingDiscount(null)
            resetDiscountForm()
          }}
          title={editingDiscount ? 'İndirim Kodu Düzenle' : 'Yeni İndirim Kodu'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kod İsmi <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={discountFormData.code_name}
                onChange={(e) => setDiscountFormData({ ...discountFormData, code_name: e.target.value })}
                placeholder="Örn: YAZ2024"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İndirim Oranı (%) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={discountFormData.discount_percentage}
                onChange={(e) => setDiscountFormData({ ...discountFormData, discount_percentage: parseInt(e.target.value) || 0 })}
                placeholder="10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={discountFormData.valid_from}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={discountFormData.valid_until}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maksimum Kullanım (Opsiyonel)
              </label>
              <Input
                type="number"
                min="1"
                value={discountFormData.max_usage}
                onChange={(e) => setDiscountFormData({ ...discountFormData, max_usage: e.target.value })}
                placeholder="Sınırsız için boş bırakın"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geçerli Olacak Müşteri (Opsiyonel)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    searchCustomersForDiscount(e.target.value)
                  }}
                  placeholder="Müşteri ara (isim veya telefon)..."
                  className="pl-10"
                />
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                {customerSearch.length >= 2 && discountCustomers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border-2 border-blue-200 bg-white shadow-xl max-h-64 overflow-y-auto">
                    <div className="p-2">
                      {discountCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedDiscountCustomer(customer)
                            setCustomerSearch(customer.full_name)
                            setDiscountCustomers([])
                          }}
                          className="w-full rounded-lg p-2 text-left hover:bg-gray-100"
                        >
                          <div className="font-medium text-gray-900">{customer.full_name}</div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {selectedDiscountCustomer && (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{selectedDiscountCustomer.full_name}</div>
                      <div className="text-sm text-gray-600">{selectedDiscountCustomer.phone}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDiscountCustomer(null)
                        setCustomerSearch('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={discountFormData.is_active}
                onChange={(e) => setDiscountFormData({ ...discountFormData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Aktif
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDiscountModal(false)
                  setEditingDiscount(null)
                  resetDiscountForm()
                }}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSaveDiscountCode} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {editingDiscount ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
