import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, services } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing visit token' },
        { status: 400 }
      )
    }

    // Parse services if it's a string (from query parameter)
    let servicesArray: string[] = []
    if (services) {
      if (typeof services === 'string') {
        try {
          servicesArray = JSON.parse(decodeURIComponent(services))
        } catch {
          servicesArray = [services]
        }
      } else if (Array.isArray(services)) {
        servicesArray = services
      }
    }

    // Use service role client to bypass RLS for token lookup
    // Customer is not authenticated, so we need to bypass RLS
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (error) {
      console.error('Service role client creation error:', error)
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Verify token is valid and not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from('visit_tokens')
      .select('*, customers(*)')
      .eq('token', token)
      .single()

    if (tokenError) {
      console.error('Token lookup error:', {
        error: tokenError,
        code: tokenError.code,
        message: tokenError.message,
        details: tokenError.details,
        hint: tokenError.hint,
        token: token.substring(0, 8) + '...'
      })
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

    // Note: We allow multiple visits per day, but each visit is counted separately
    // The system resets at midnight (00:00), so visits on different calendar days are all counted
    // Example: Visit at 10 PM on 24th and 9 AM on 25th are both counted

    // Create visit record with services
    const { error: visitError } = await supabase
      .from('visits')
      .insert({
        salon_id: tokenData.salon_id,
        customer_id: tokenData.customer_id,
        created_by: tokenData.created_by,
        visited_at: new Date().toISOString(),
        services: servicesArray.length > 0 ? servicesArray : null,
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

    // Calculate new visit count
    const { count: newVisitCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    // Update loyalty level based on visit count
    if (newVisitCount !== null) {
      // Load salon thresholds
      const { data: salonData } = await supabase
        .from('salons')
        .select('loyalty_silver_min_visits, loyalty_gold_min_visits, loyalty_platinum_min_visits, loyalty_vip_min_visits')
        .eq('id', salon.id)
        .single()
      
      const vipThreshold = salonData?.loyalty_vip_min_visits ?? 40
      const platinumThreshold = salonData?.loyalty_platinum_min_visits ?? 30
      const goldThreshold = salonData?.loyalty_gold_min_visits ?? 20
      const silverThreshold = salonData?.loyalty_silver_min_visits ?? 10
      
      const newLevel = newVisitCount >= vipThreshold ? 'VIP' :
                       newVisitCount >= platinumThreshold ? 'PLATINUM' :
                       newVisitCount >= goldThreshold ? 'GOLD' :
                       newVisitCount >= silverThreshold ? 'SILVER' : 'BRONZE'
      
      // Check if level changed
      const { data: currentCustomer } = await supabase
        .from('customers')
        .select('loyalty_level')
        .eq('id', customer.id)
        .single()
      
      if (currentCustomer?.loyalty_level !== newLevel) {
        // Level up! Give discount
        await supabase
          .from('customers')
          .update({
            loyalty_level: newLevel,
            has_loyalty_discount: true, // Yeni seviyeye geçince indirim hakkı ver
          })
          .eq('id', customer.id)
      }
    }

    // Handle referral rewards (if this is referred customer's first visit)
    if (newVisitCount === 1) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('referred_by')
        .eq('id', customer.id)
        .single()

      if (customerData?.referred_by) {
        // This is the first visit for a referred customer
        // Get referrer's current referral count
        const { data: referrerData } = await supabase
          .from('customers')
          .select('referral_count')
          .eq('id', customerData.referred_by)
          .single()
        
        const currentCount = referrerData?.referral_count || 0
        
        // Give reward to referrer
        await supabase
          .from('customers')
          .update({
            referral_count: currentCount + 1,
            has_referral_discount: true, // %15 indirim hakkı
          })
          .eq('id', customerData.referred_by)
        
        // Give reward to referred customer
        await supabase
          .from('customers')
          .update({
            has_referral_discount: true, // %15 indirim hakkı
          })
          .eq('id', customer.id)
        
        // Create referral reward record
        await supabase
          .from('referral_rewards')
          .insert({
            salon_id: tokenData.salon_id,
            referrer_id: customerData.referred_by,
            referred_id: customer.id,
          })
      }
    }

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

