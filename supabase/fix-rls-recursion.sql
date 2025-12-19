-- Fix RLS Recursion Issue
-- Run this in Supabase SQL Editor to fix the infinite recursion error

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view profiles in their salon" ON profiles;
DROP POLICY IF EXISTS "Users can view their salon" ON salons;
DROP POLICY IF EXISTS "Users can view customers in their salon" ON customers;
DROP POLICY IF EXISTS "Staff and owners can create customers" ON customers;
DROP POLICY IF EXISTS "Staff and owners can update customers" ON customers;
DROP POLICY IF EXISTS "Users can view visits in their salon" ON visits;
DROP POLICY IF EXISTS "Staff and owners can create visits" ON visits;
DROP POLICY IF EXISTS "Users can view visit tokens in their salon" ON visit_tokens;
DROP POLICY IF EXISTS "Staff and owners can create visit tokens" ON visit_tokens;

-- Recreate function with SECURITY DEFINER (this breaks the recursion)
CREATE OR REPLACE FUNCTION get_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate policies using the function
CREATE POLICY "Users can view profiles in their salon"
  ON profiles FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Users can view their salon"
  ON salons FOR SELECT
  USING (
    id = get_user_salon_id()
  );

CREATE POLICY "Users can view customers in their salon"
  ON customers FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Staff and owners can create customers"
  ON customers FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Staff and owners can update customers"
  ON customers FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Users can view visits in their salon"
  ON visits FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Staff and owners can create visits"
  ON visits FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can view visit tokens in their salon"
  ON visit_tokens FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Staff and owners can create visit tokens"
  ON visit_tokens FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = auth.uid()
  );

