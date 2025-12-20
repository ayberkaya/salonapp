-- Add Missing Foreign Key Indexes
-- This migration adds indexes on foreign key columns to improve query performance
-- Foreign keys without indexes can cause performance issues during JOINs and referential integrity checks

-- ============================================
-- Campaign Templates
-- ============================================
-- Index for created_by foreign key
CREATE INDEX IF NOT EXISTS idx_campaign_templates_created_by 
  ON campaign_templates(created_by);

-- ============================================
-- Campaigns
-- ============================================
-- Index for created_by foreign key
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by 
  ON campaigns(created_by);

-- Index for template_id foreign key
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id 
  ON campaigns(template_id);

-- ============================================
-- Visit Tokens
-- ============================================
-- Index for created_by foreign key
CREATE INDEX IF NOT EXISTS idx_visit_tokens_created_by 
  ON visit_tokens(created_by);

-- Note: idx_visit_tokens_salon_id already exists in schema.sql
-- But let's ensure it exists
CREATE INDEX IF NOT EXISTS idx_visit_tokens_salon_id 
  ON visit_tokens(salon_id);

-- ============================================
-- Visits
-- ============================================
-- Index for created_by foreign key
CREATE INDEX IF NOT EXISTS idx_visits_created_by 
  ON visits(created_by);

