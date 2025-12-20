-- Add notes column to customers table
-- This allows salon staff to add internal notes about customers
-- Example: "Türk kahvesini tek şekerli içer"

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN customers.notes IS 'Internal notes about the customer, visible only to salon staff';

