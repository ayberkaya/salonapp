-- Update services RLS policies to allow staff to manage services
-- Staff should be able to add, update, and delete services in their salon

-- Drop existing policy
DROP POLICY IF EXISTS "Owners can manage services in their salon" ON services;

-- Create new policy that allows both owners and staff to manage services
CREATE POLICY "Users can manage services in their salon"
  ON services FOR ALL
  USING (salon_id = get_user_salon_id())
  WITH CHECK (salon_id = get_user_salon_id());

