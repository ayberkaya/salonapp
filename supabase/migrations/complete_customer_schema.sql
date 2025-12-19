-- Complete customer schema migration
-- This migration adds all customer detail fields

-- Add province and district columns (if not already added)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS district TEXT;

-- Drop old date_of_birth column if it exists
ALTER TABLE customers 
DROP COLUMN IF EXISTS date_of_birth;

-- Add new birth_day and birth_month columns
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS birth_day INTEGER CHECK (birth_day >= 1 AND birth_day <= 31),
ADD COLUMN IF NOT EXISTS birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12);

