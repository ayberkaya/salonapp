-- Add loyalty level visit thresholds to salons table
-- This allows each salon to customize the visit count required for each loyalty level

ALTER TABLE salons
ADD COLUMN IF NOT EXISTS loyalty_silver_min_visits INTEGER DEFAULT 10 CHECK (loyalty_silver_min_visits >= 0),
ADD COLUMN IF NOT EXISTS loyalty_gold_min_visits INTEGER DEFAULT 20 CHECK (loyalty_gold_min_visits >= 0),
ADD COLUMN IF NOT EXISTS loyalty_platinum_min_visits INTEGER DEFAULT 30 CHECK (loyalty_platinum_min_visits >= 0),
ADD COLUMN IF NOT EXISTS loyalty_vip_min_visits INTEGER DEFAULT 40 CHECK (loyalty_vip_min_visits >= 0);

-- Update existing salons with default values if they are NULL
UPDATE salons
SET 
  loyalty_silver_min_visits = COALESCE(loyalty_silver_min_visits, 10),
  loyalty_gold_min_visits = COALESCE(loyalty_gold_min_visits, 20),
  loyalty_platinum_min_visits = COALESCE(loyalty_platinum_min_visits, 30),
  loyalty_vip_min_visits = COALESCE(loyalty_vip_min_visits, 40)
WHERE 
  loyalty_silver_min_visits IS NULL 
  OR loyalty_gold_min_visits IS NULL 
  OR loyalty_platinum_min_visits IS NULL 
  OR loyalty_vip_min_visits IS NULL;

