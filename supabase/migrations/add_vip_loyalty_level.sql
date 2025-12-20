-- Add VIP loyalty level discount setting to salons table
-- This adds the VIP level as the highest loyalty tier (40+ visits)

ALTER TABLE salons
ADD COLUMN IF NOT EXISTS loyalty_vip_discount INTEGER DEFAULT 30 CHECK (loyalty_vip_discount >= 0 AND loyalty_vip_discount <= 100);

-- Update existing salons with default value if it is NULL
UPDATE salons
SET loyalty_vip_discount = COALESCE(loyalty_vip_discount, 30)
WHERE loyalty_vip_discount IS NULL;

