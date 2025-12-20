-- Add welcome discount fields to customers table
-- This discount is given once when customer registers (either self-registration or salon registration)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS has_welcome_discount BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_discount_used_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_welcome_discount ON customers(has_welcome_discount) WHERE has_welcome_discount = true;

