-- Add UPDATE policy for salons table
-- Owners should be able to update their salon settings

CREATE POLICY "Owners can update their salon"
  ON salons FOR UPDATE
  USING (
    id = get_user_salon_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'OWNER'
      AND salon_id = salons.id
    )
  )
  WITH CHECK (
    id = get_user_salon_id()
  );

