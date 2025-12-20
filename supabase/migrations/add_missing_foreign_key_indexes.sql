-- Add missing indexes for foreign keys to improve performance
-- These indexes help with JOIN operations and foreign key constraint checks

-- Index for discount_codes.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_discount_codes_created_by ON discount_codes(created_by);

-- Index for invoices.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
