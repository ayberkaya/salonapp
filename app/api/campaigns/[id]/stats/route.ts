import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('salon_id', profile.salon_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get recipients stats
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('status, sent_at, delivered_at, opened_at')
      .eq('campaign_id', id)

    if (recipientsError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const stats = {
      total: recipients?.length || 0,
      sent: recipients?.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'OPENED').length || 0,
      delivered: recipients?.filter((r) => r.status === 'DELIVERED' || r.status === 'OPENED').length || 0,
      opened: recipients?.filter((r) => r.status === 'OPENED').length || 0,
      failed: recipients?.filter((r) => r.status === 'FAILED').length || 0,
      pending: recipients?.filter((r) => r.status === 'PENDING').length || 0,
    }

    return NextResponse.json({
      campaign,
      stats,
    })
  } catch (error) {
    console.error('Error fetching campaign stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

