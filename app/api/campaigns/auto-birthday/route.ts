import { createClient } from '@/lib/supabase/server'
import { smsProvider } from '@/lib/sms'
import { NextResponse } from 'next/server'

// This endpoint should be called by a cron job daily
// to send birthday campaigns to customers whose birthday is today
export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date()
    const day = today.getDate()
    const month = today.getMonth() + 1 // JavaScript months are 0-indexed

    // Find customers with birthday today
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('birth_day', day)
      .eq('birth_month', month)

    if (customersError) {
      console.error('Error fetching birthday customers:', customersError)
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ message: 'No birthdays today', sent: 0 })
    }

    // Get birthday template or use default message
    const { data: templates } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('campaign_type', 'BIRTHDAY')
      .limit(1)
      .single()

    const message = templates?.message || `🎉 Doğum gününüz kutlu olsun! Bugün özel indirimimizden yararlanabilirsiniz.`

    let sentCount = 0
    let failedCount = 0

    // Group customers by salon_id
    const customersBySalon = new Map<string, typeof customers>()
    for (const customer of customers) {
      if (!customersBySalon.has(customer.salon_id)) {
        customersBySalon.set(customer.salon_id, [])
      }
      customersBySalon.get(customer.salon_id)!.push(customer)
    }

    // Process each salon
    for (const [salonId, salonCustomers] of customersBySalon) {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          salon_id: salonId,
          name: `Doğum Günü Kampanyası - ${today.toLocaleDateString('tr-TR')}`,
          message: message,
          campaign_type: 'BIRTHDAY',
          status: 'SENDING',
          created_by: salonId, // System generated
        })
        .select()
        .single()

      if (campaignError || !campaign) {
        console.error('Error creating campaign:', campaignError)
        continue
      }

      // Create recipient records
      const recipients = salonCustomers.map((customer) => ({
        campaign_id: campaign.id,
        customer_id: customer.id,
        phone: customer.phone,
        status: 'PENDING',
      }))

      await supabase.from('campaign_recipients').insert(recipients)

      // Send messages
      for (const customer of salonCustomers) {
        try {
          // Personalize message with customer name
          const personalizedMessage = message.replace('{name}', customer.full_name)

          await smsProvider.sendCampaign(customer.phone, personalizedMessage)

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
          console.error('Error sending birthday message:', error)
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
    }

    return NextResponse.json({
      message: 'Birthday campaigns processed',
      sent: sentCount,
      failed: failedCount,
    })
  } catch (error) {
    console.error('Error processing birthday campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

