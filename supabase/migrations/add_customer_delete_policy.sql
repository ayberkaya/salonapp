-- Add DELETE policy for customers table
-- This allows staff and owners to delete customers in their salon

DROP POLICY IF EXISTS "Staff and owners can delete customers" ON customers;

CREATE POLICY "Staff and owners can delete customers"
  ON customers FOR DELETE
  USING (
    salon_id = get_user_salon_id()
  );

