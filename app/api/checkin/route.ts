import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

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

    if (tokenError) {
      console.error('Token lookup error:', tokenError)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check expiration - use milliseconds comparison to avoid timezone issues
    const now = Date.now()
    const expiresAt = new Date(tokenData.expires_at).getTime()
    
    // Debug logging
    console.log('Token check:', {
      token: token.substring(0, 8) + '...',
      now: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      expiresAtRaw: tokenData.expires_at,
      timeRemaining: Math.floor((expiresAt - now) / 1000),
      isExpired: now > expiresAt
    })

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

    // Check if customer data exists
    if (!tokenData.customers) {
      console.error('Customer not found for token:', token)
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const customer = tokenData.customers as { id: string; phone: string; full_name: string }

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
      console.error('Visit creation error:', {
        error: visitError,
        code: visitError.code,
        message: visitError.message,
        details: visitError.details,
        hint: visitError.hint
      })
      return NextResponse.json(
        { error: 'Failed to record visit', details: visitError.message },
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

