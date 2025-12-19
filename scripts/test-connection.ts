import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local
const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('#') || !trimmed) return
  const [key, ...valueParts] = trimmed.split('=')
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim()
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value
    }
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('Testing connection...')
console.log('URL:', supabaseUrl)
console.log('Key (first 50 chars):', supabaseServiceKey.substring(0, 50))

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test with a simple query
supabase.from('salons').select('count').then(({ data, error }) => {
  if (error) {
    console.error('❌ Error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error)
  } else {
    console.log('✓ Connection successful!')
    console.log('   Data:', data)
  }
})

