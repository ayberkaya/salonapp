-- Change date_of_birth to birth_day and birth_month (day and month only, no year)
-- First, drop the old column if it exists
ALTER TABLE customers 
DROP COLUMN IF EXISTS date_of_birth;

-- Add new columns for birth day and month
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS birth_day INTEGER CHECK (birth_day >= 1 AND birth_day <= 31),
ADD COLUMN IF NOT EXISTS birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12);

