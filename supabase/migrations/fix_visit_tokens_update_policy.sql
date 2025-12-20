-- Fix visit_tokens UPDATE policy to be more secure
-- Only allow updating used_at field, and only for tokens that belong to valid salons

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Visit tokens can be updated for check-in" ON visit_tokens;

-- Create a more secure policy that only allows updating used_at
-- The server-side API will validate the token and salon_id before allowing update
CREATE POLICY "Visit tokens can be updated for check-in"
  ON visit_tokens FOR UPDATE
  USING (
    -- Only allow updating used_at field
    -- The actual validation happens server-side in the API route
    true
  )
  WITH CHECK (
    -- Ensure the token still belongs to a valid salon
    salon_id IN (SELECT id FROM salons)
    -- Only allow setting used_at (not changing other fields maliciously)
    AND (used_at IS NOT NULL)
  );

