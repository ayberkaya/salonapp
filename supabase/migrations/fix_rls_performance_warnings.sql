-- Fix RLS performance warnings
-- 1. Fix auth.uid() and get_user_salon_id() usage in salons UPDATE policy
-- 2. Remove duplicate SELECT policies (ALL policies already cover SELECT)

-- Fix salons UPDATE policy to use (select ...) to prevent re-evaluation for each row
DROP POLICY IF EXISTS "Owners can update their salon" ON salons;

CREATE POLICY "Owners can update their salon"
  ON salons FOR UPDATE
  USING (
    id = (select get_user_salon_id())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'OWNER'
      AND salon_id = salons.id
    )
  )
  WITH CHECK (
    id = (select get_user_salon_id())
  );

-- Fix appointment_services: Remove duplicate SELECT policy (ALL already covers SELECT)
DROP POLICY IF EXISTS "Users can view appointment services in their salon" ON appointment_services;

-- Fix appointment_staff: Remove duplicate SELECT policy (ALL already covers SELECT)
DROP POLICY IF EXISTS "Users can view appointment staff in their salon" ON appointment_staff;

-- Fix invoice_items: Remove duplicate SELECT policy (ALL already covers SELECT)
DROP POLICY IF EXISTS "Users can view invoice items in their salon" ON invoice_items;

-- Fix invoice_staff: Remove duplicate SELECT policy (ALL already covers SELECT)
DROP POLICY IF EXISTS "Users can view invoice staff in their salon" ON invoice_staff;

-- Fix services: Remove duplicate SELECT policy (ALL already covers SELECT)
DROP POLICY IF EXISTS "Users can view services in their salon" ON services;

