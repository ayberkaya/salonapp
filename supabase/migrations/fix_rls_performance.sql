-- Fix RLS Performance Issues
-- This migration fixes:
-- 1. auth_rls_initplan: Replace auth.uid() with (select auth.uid()) for better performance
-- 2. multiple_permissive_policies: Merge duplicate SELECT policies on profiles table

-- ============================================
-- 1. Fix auth_rls_initplan issues
-- ============================================

-- Note: profiles policies will be fixed in section 2 (multiple_permissive_policies)

-- Fix visits: "Staff and owners can create visits"
DROP POLICY IF EXISTS "Staff and owners can create visits" ON visits;
CREATE POLICY "Staff and owners can create visits"
  ON visits FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix visit_tokens: "Staff and owners can create visit tokens"
DROP POLICY IF EXISTS "Staff and owners can create visit tokens" ON visit_tokens;
CREATE POLICY "Staff and owners can create visit tokens"
  ON visit_tokens FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaign_templates: "Owners can create templates"
DROP POLICY IF EXISTS "Owners can create templates" ON campaign_templates;
CREATE POLICY "Owners can create templates"
  ON campaign_templates FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaign_templates: "Owners can update templates"
DROP POLICY IF EXISTS "Owners can update templates" ON campaign_templates;
CREATE POLICY "Owners can update templates"
  ON campaign_templates FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaign_templates: "Owners can delete templates"
DROP POLICY IF EXISTS "Owners can delete templates" ON campaign_templates;
CREATE POLICY "Owners can delete templates"
  ON campaign_templates FOR DELETE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaigns: "Owners can create campaigns"
DROP POLICY IF EXISTS "Owners can create campaigns" ON campaigns;
CREATE POLICY "Owners can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaigns: "Owners can update campaigns"
DROP POLICY IF EXISTS "Owners can update campaigns" ON campaigns;
CREATE POLICY "Owners can update campaigns"
  ON campaigns FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Fix campaigns: "Owners can delete campaigns"
DROP POLICY IF EXISTS "Owners can delete campaigns" ON campaigns;
CREATE POLICY "Owners can delete campaigns"
  ON campaigns FOR DELETE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- ============================================
-- 2. Fix multiple_permissive_policies on profiles
-- ============================================
-- Merge the two SELECT policies into one that covers both cases
-- This also fixes auth_rls_initplan for profiles table

-- Drop both existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their salon" ON profiles;

-- Create a single unified policy that covers both cases
-- Users can view their own profile OR profiles in their salon
-- Using (select auth.uid()) for better performance
CREATE POLICY "Users can view profiles in their salon"
  ON profiles FOR SELECT
  USING (
    (select auth.uid()) = id
    OR salon_id = get_user_salon_id()
  );

