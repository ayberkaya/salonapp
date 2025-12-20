-- Add loyalty level discount settings to salons table
-- This allows each salon to customize discount percentages for loyalty levels

ALTER TABLE salons
ADD COLUMN IF NOT EXISTS loyalty_bronze_discount INTEGER DEFAULT 10 CHECK (loyalty_bronze_discount >= 0 AND loyalty_bronze_discount <= 100),
ADD COLUMN IF NOT EXISTS loyalty_silver_discount INTEGER DEFAULT 15 CHECK (loyalty_silver_discount >= 0 AND loyalty_silver_discount <= 100),
ADD COLUMN IF NOT EXISTS loyalty_gold_discount INTEGER DEFAULT 20 CHECK (loyalty_gold_discount >= 0 AND loyalty_gold_discount <= 100),
ADD COLUMN IF NOT EXISTS loyalty_platinum_discount INTEGER DEFAULT 25 CHECK (loyalty_platinum_discount >= 0 AND loyalty_platinum_discount <= 100);

-- Update existing salons with default values if they are NULL
UPDATE salons
SET 
  loyalty_bronze_discount = COALESCE(loyalty_bronze_discount, 10),
  loyalty_silver_discount = COALESCE(loyalty_silver_discount, 15),
  loyalty_gold_discount = COALESCE(loyalty_gold_discount, 20),
  loyalty_platinum_discount = COALESCE(loyalty_platinum_discount, 25)
WHERE 
  loyalty_bronze_discount IS NULL 
  OR loyalty_silver_discount IS NULL 
  OR loyalty_gold_discount IS NULL 
  OR loyalty_platinum_discount IS NULL;

