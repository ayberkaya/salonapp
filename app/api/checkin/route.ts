import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, phone } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing visit token' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify token is valid and not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from('visit_tokens')
      .select('*, customers(*)')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 410 }
      )
    }

    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'Token has already been used' },
        { status: 409 }
      )
    }

    const customer = tokenData.customers as { id: string; phone: string; full_name: string }

    // Verify phone number matches if provided
    if (phone && customer.phone !== phone) {
      return NextResponse.json(
        { error: 'Phone number does not match' },
        { status: 403 }
      )
    }

    // Check if customer already visited today (optional: prevent duplicate visits)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayVisits } = await supabase
      .from('visits')
      .select('id')
      .eq('customer_id', customer.id)
      .gte('visited_at', today.toISOString())

    if (todayVisits && todayVisits.length > 0) {
      return NextResponse.json(
        { error: 'You have already checked in today' },
        { status: 409 }
      )
    }

    // Create visit record
    const { error: visitError } = await supabase
      .from('visits')
      .insert({
        salon_id: tokenData.salon_id,
        customer_id: tokenData.customer_id,
        created_by: tokenData.created_by,
        visited_at: new Date().toISOString(),
      })

    if (visitError) {
      console.error('Visit creation error:', visitError)
      return NextResponse.json(
        { error: 'Failed to record visit' },
        { status: 500 }
      )
    }

    // Mark token as used
    await supabase
      .from('visit_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    // Update customer last_visit_at
    await supabase
      .from('customers')
      .update({ last_visit_at: new Date().toISOString() })
      .eq('id', customer.id)

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.full_name,
      },
    })
  } catch (error) {
    console.error('Checkin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

