-- Add color column to staff table for unique color assignment per staff member
ALTER TABLE staff ADD COLUMN IF NOT EXISTS color TEXT;

-- Create index for color lookups
CREATE INDEX IF NOT EXISTS idx_staff_color ON staff(color) WHERE color IS NOT NULL;

