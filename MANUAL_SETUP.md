# Manual Setup Guide

If the seed script doesn't work, follow these steps manually:

## Step 1: Run Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mnnojeqqkmvogltrhmin
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

## Step 2: Create Users

1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add user** > **Create new user**
3. Create these three users:

   **User 1 (Owner):**
   - Email: `owner@salon.com`
   - Password: `owner123`
   - Auto Confirm User: ✅ (checked)

   **User 2 (Staff 1):**
   - Email: `staff1@salon.com`
   - Password: `staff123`
   - Auto Confirm User: ✅ (checked)

   **User 3 (Staff 2):**
   - Email: `staff2@salon.com`
   - Password: `staff123`
   - Auto Confirm User: ✅ (checked)

## Step 3: Create Salon

1. Go to **Table Editor** > **salons**
2. Click **Insert** > **Insert row**
3. Enter:
   - name: `Kuaför Sadakat`
4. Click **Save**
5. **Copy the salon ID** (you'll need it for profiles)

## Step 4: Create Profiles

1. Go to **Authentication** > **Users**
2. For each user, **copy their User UID** (click on the user to see it)

3. Go to **Table Editor** > **profiles**
4. Click **Insert** > **Insert row** for each user:

   **Profile 1 (Owner):**
   - id: `[paste owner user UID]`
   - salon_id: `[paste salon ID from step 3]`
   - full_name: `Salon Owner`
   - role: `OWNER`

   **Profile 2 (Staff 1):**
   - id: `[paste staff1 user UID]`
   - salon_id: `[paste salon ID from step 3]`
   - full_name: `Staff Member 1`
   - role: `STAFF`

   **Profile 3 (Staff 2):**
   - id: `[paste staff2 user UID]`
   - salon_id: `[paste salon ID from step 3]`
   - full_name: `Staff Member 2`
   - role: `STAFF`

## Step 5: (Optional) Create Sample Customers

1. Go to **Table Editor** > **customers**
2. Click **Insert** > **Insert row** for each:

   - full_name: `Ahmet Yılmaz`
   - phone: `+905551234567`
   - salon_id: `[paste salon ID]`
   - kvkk_consent_at: `[click calendar, select today]`

   - full_name: `Ayşe Demir`
   - phone: `+905551234568`
   - salon_id: `[paste salon ID]`
   - kvkk_consent_at: `[click calendar, select today]`

   (Repeat for other sample customers if desired)

## Step 6: Verify Service Role Key

If you want to use the seed script later:

1. Go to **Settings** > **API** in Supabase Dashboard
2. Scroll down to **Project API keys**
3. Find **service_role** key (⚠️ secret, do not expose)
4. Copy it and update `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

## Done! 🎉

You can now:
- Start the dev server: `npm run dev`
- Login at http://localhost:3000/login
- Use credentials: `owner@salon.com` / `owner123`

