# Setup Checklist

Follow these steps to get the system running:

## ✅ Pre-Setup

- [ ] Node.js 18+ installed
- [ ] Supabase account created
- [ ] Git repository initialized (optional)

## ✅ Supabase Setup

1. [ ] Create new Supabase project
2. [ ] Run `supabase/schema.sql` in SQL Editor
3. [ ] Copy project URL and anon key
4. [ ] (Optional) Copy service role key for seed script

## ✅ Local Environment

1. [ ] Run `npm install`
2. [ ] Create `.env.local` file
3. [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
4. [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. [ ] (Optional) Add `SUPABASE_SERVICE_ROLE_KEY` for seed script

## ✅ Create Users

1. [ ] Go to Supabase Dashboard > Authentication > Users
2. [ ] Create `owner@salon.com` with password `owner123`
3. [ ] Create `staff1@salon.com` with password `staff123`
4. [ ] Create `staff2@salon.com` with password `staff123`

## ✅ Create Profiles

**Option 1: Via SQL Editor (Recommended)**

1. [ ] Get user IDs from Authentication > Users
2. [ ] Run seed script: `npx tsx scripts/seed.ts`
3. [ ] Or manually insert profiles via SQL:

```sql
-- Get salon_id from salons table first
SELECT id FROM salons;

-- Then insert profiles (replace USER_IDs and SALON_ID)
INSERT INTO profiles (id, salon_id, full_name, role) VALUES
  ('USER_ID_OWNER', 'SALON_ID', 'Salon Owner', 'OWNER'),
  ('USER_ID_STAFF1', 'SALON_ID', 'Staff Member 1', 'STAFF'),
  ('USER_ID_STAFF2', 'SALON_ID', 'Staff Member 2', 'STAFF');
```

**Option 2: Via Table Editor**

1. [ ] Go to Supabase Dashboard > Table Editor > profiles
2. [ ] Insert rows manually with user IDs from auth.users

## ✅ Test the System

1. [ ] Run `npm run dev`
2. [ ] Open http://localhost:3000
3. [ ] Login as owner@salon.com
4. [ ] Verify dashboard loads
5. [ ] Create a test customer
6. [ ] Start a visit session
7. [ ] Scan QR code (or open URL manually)
8. [ ] Complete check-in flow

## ✅ Production Deployment

1. [ ] Push code to GitHub
2. [ ] Import to Vercel
3. [ ] Add environment variables
4. [ ] Deploy
5. [ ] Test production URL

## 🔧 Troubleshooting

### Can't login
- Check user exists in Supabase Auth
- Check profile exists in profiles table
- Verify profile.salon_id matches a salon

### RLS errors
- Verify schema.sql was run completely
- Check RLS policies are enabled
- Verify user has correct salon_id

### QR code not working
- Check NEXT_PUBLIC_SUPABASE_URL is set
- Verify visit_tokens table exists
- Check browser console for errors

### OTP not received
- In MVP, check server console logs (OTP is mocked)
- For production, implement real SMS provider

