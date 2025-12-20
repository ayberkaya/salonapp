import { createClient } from '@/lib/supabase/server'
import { smsProvider } from '@/lib/sms'
import { NextResponse } from 'next/server'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// to send scheduled campaigns
export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date()

    // Find campaigns scheduled to be sent now or in the past
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', now.toISOString())

    if (campaignsError) {
      console.error('Error fetching scheduled campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No campaigns to send', sent: 0 })
    }

    let sentCount = 0
    let failedCount = 0

    for (const campaign of campaigns) {
      // Update campaign status to SENDING
      await supabase
        .from('campaigns')
        .update({ status: 'SENDING' })
        .eq('id', campaign.id)

      // Get recipients for this campaign
      const { data: recipients, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select('*, customers(phone)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'PENDING')

      if (recipientsError || !recipients) {
        console.error('Error fetching recipients:', recipientsError)
        await supabase
          .from('campaigns')
          .update({ status: 'SCHEDULED' })
          .eq('id', campaign.id)
        continue
      }

      // Send messages to recipients
      for (const recipient of recipients) {
        try {
          const phone = Array.isArray(recipient.customers)
            ? recipient.customers[0]?.phone
            : (recipient.customers as any)?.phone || recipient.phone

          if (!phone) continue

          await smsProvider.sendCampaign(phone, campaign.message)

          await supabase
            .from('campaign_recipients')
            .update({
              status: 'SENT',
              sent_at: new Date().toISOString(),
            })
            .eq('id', recipient.id)

          sentCount++
        } catch (error) {
          console.error('Error sending message:', error)
          await supabase
            .from('campaign_recipients')
            .update({
              status: 'FAILED',
              error_message: 'SMS gönderilemedi',
            })
            .eq('id', recipient.id)

          failedCount++
        }
      }

      // Update campaign status to SENT
      await supabase
        .from('campaigns')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaign.id)
    }

    return NextResponse.json({
      message: 'Campaigns processed',
      sent: sentCount,
      failed: failedCount,
    })
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

