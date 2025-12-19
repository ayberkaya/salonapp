/**
 * Seed script for initial data
 * 
 * Run this after setting up Supabase:
 * 1. Create a salon
 * 2. Create owner and staff profiles
 * 3. Create sample customers
 * 
 * Usage:
 * npx tsx scripts/seed.ts
 * 
 * Note: You'll need to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in your environment for this script to work.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  console.log('Starting seed...')

  // 1. Create salon
  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .insert({ name: 'Kuaför Sadakat' })
    .select()
    .single()

  if (salonError) {
    console.error('Error creating salon:', salonError)
    return
  }

  console.log('✓ Created salon:', salon.name)

  // 2. Instructions for creating users and profiles
  console.log('\n⚠️  IMPORTANT: Manual setup required:')
  console.log('\n   1. Create users in Supabase Auth:')
  console.log('      - Go to Supabase Dashboard > Authentication > Users')
  console.log('      - Click "Add user" and create:')
  console.log('        * owner@salon.com (password: owner123)')
  console.log('        * staff1@salon.com (password: staff123)')
  console.log('        * staff2@salon.com (password: staff123)')
  console.log('\n   2. Create profiles manually via SQL Editor:')
  console.log('      Replace USER_ID_OWNER, USER_ID_STAFF1, USER_ID_STAFF2 with actual user IDs from Auth')
  console.log('\n      INSERT INTO profiles (id, salon_id, full_name, role) VALUES')
  console.log(`        ('USER_ID_OWNER', '${salon.id}', 'Salon Owner', 'OWNER'),`)
  console.log(`        ('USER_ID_STAFF1', '${salon.id}', 'Staff Member 1', 'STAFF'),`)
  console.log(`        ('USER_ID_STAFF2', '${salon.id}', 'Staff Member 2', 'STAFF');`)
  console.log('\n   Or use the Supabase Dashboard > Table Editor to insert profiles manually.\n')

  // Try to create profiles if we have service role key (admin access)
  try {
    const { data: users } = await supabase.auth.admin.listUsers()
    
    if (users?.users) {
      const ownerEmail = 'owner@salon.com'
      const ownerAuthUser = users.users.find(u => u.email === ownerEmail)

      if (ownerAuthUser) {
        const { error: ownerProfileError } = await supabase
          .from('profiles')
          .upsert({
            id: ownerAuthUser.id,
            salon_id: salon.id,
            full_name: 'Salon Owner',
            role: 'OWNER',
          }, { onConflict: 'id' })

        if (!ownerProfileError) {
          console.log('✓ Created/updated owner profile')
        }
      }

      // Create staff profiles
      const staffEmails = ['staff1@salon.com', 'staff2@salon.com']
      const staffNames = ['Staff Member 1', 'Staff Member 2']

      for (let i = 0; i < staffEmails.length; i++) {
        const staffAuthUser = users.users.find(u => u.email === staffEmails[i])
        if (staffAuthUser) {
          const { error: staffProfileError } = await supabase
            .from('profiles')
            .upsert({
              id: staffAuthUser.id,
              salon_id: salon.id,
              full_name: staffNames[i],
              role: 'STAFF',
            }, { onConflict: 'id' })

          if (!staffProfileError) {
            console.log(`✓ Created/updated staff profile: ${staffNames[i]}`)
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Could not auto-create profiles (admin access required)')
    console.log('   Please create profiles manually as shown above')
  }

  // 5. Create sample customers
  const sampleCustomers = [
    { name: 'Ahmet Yılmaz', phone: '+905551234567' },
    { name: 'Ayşe Demir', phone: '+905551234568' },
    { name: 'Mehmet Kaya', phone: '+905551234569' },
    { name: 'Fatma Şahin', phone: '+905551234570' },
    { name: 'Ali Öztürk', phone: '+905551234571' },
  ]

  for (const customer of sampleCustomers) {
    const { error: customerError } = await supabase
      .from('customers')
      .insert({
        salon_id: salon.id,
        full_name: customer.name,
        phone: customer.phone,
        kvkk_consent_at: new Date().toISOString(),
      })

    if (!customerError) {
      console.log(`✓ Created customer: ${customer.name}`)
    }
  }

  console.log('\n✓ Seed completed!')
  console.log('\nYou can now login with:')
  console.log('  - owner@salon.com / owner123')
  console.log('  - staff1@salon.com / staff123')
  console.log('  - staff2@salon.com / staff123')
}

seed().catch(console.error)

