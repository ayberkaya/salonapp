-- Quick Setup SQL Script
-- Run this in Supabase SQL Editor after creating the user in Authentication

-- Step 1: Create salon (if it doesn't exist)
INSERT INTO salons (name)
VALUES ('Kuaför Sadakat')
ON CONFLICT DO NOTHING;

-- Step 2: Get the salon ID (you'll need to replace SALON_ID below)
-- Run this query first to get your salon ID:
-- SELECT id FROM salons WHERE name = 'Kuaför Sadakat';

-- Step 3: Create profile for owner@salon.com
-- Replace USER_ID_OWNER with the actual user ID from Authentication > Users
-- Replace SALON_ID with the salon ID from step 2
-- 
-- To get USER_ID_OWNER:
-- 1. Go to Authentication > Users
-- 2. Click on owner@salon.com
-- 3. Copy the "User UID" value
--
-- Then run:
-- INSERT INTO profiles (id, salon_id, full_name, role)
-- VALUES (
--   'USER_ID_OWNER',  -- Replace with actual user ID
--   (SELECT id FROM salons WHERE name = 'Kuaför Sadakat' LIMIT 1),
--   'Salon Owner',
--   'OWNER'
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   salon_id = EXCLUDED.salon_id,
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role;

-- OR use this automated version (requires you to know the user ID):
-- Uncomment and replace USER_ID_OWNER:

/*
DO $$
DECLARE
  v_salon_id UUID;
  v_user_id UUID := 'USER_ID_OWNER'; -- Replace with actual user ID from auth.users
BEGIN
  -- Get or create salon
  SELECT id INTO v_salon_id FROM salons WHERE name = 'Kuaför Sadakat' LIMIT 1;
  
  IF v_salon_id IS NULL THEN
    INSERT INTO salons (name) VALUES ('Kuaför Sadakat') RETURNING id INTO v_salon_id;
  END IF;
  
  -- Create profile
  INSERT INTO profiles (id, salon_id, full_name, role)
  VALUES (v_user_id, v_salon_id, 'Salon Owner', 'OWNER')
  ON CONFLICT (id) DO UPDATE SET
    salon_id = EXCLUDED.salon_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
    
  RAISE NOTICE 'Profile created successfully!';
END $$;
*/

