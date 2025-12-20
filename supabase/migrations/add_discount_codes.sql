-- Discount Codes table
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  code_name TEXT NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  max_usage INTEGER DEFAULT NULL,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (valid_until > valid_from),
  CONSTRAINT valid_usage CHECK (max_usage IS NULL OR max_usage > 0)
);

-- Indexes for performance
CREATE INDEX idx_discount_codes_salon_id ON discount_codes(salon_id);
CREATE INDEX idx_discount_codes_code_name ON discount_codes(code_name);
CREATE INDEX idx_discount_codes_customer_id ON discount_codes(customer_id);
CREATE INDEX idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);
CREATE INDEX idx_discount_codes_is_active ON discount_codes(is_active);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Discount Codes policies
CREATE POLICY "Users can view discount codes in their salon"
  ON discount_codes FOR SELECT
  USING (salon_id = get_user_salon_id());

CREATE POLICY "Owners can create discount codes"
  ON discount_codes FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Owners can update discount codes"
  ON discount_codes FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
  )
  WITH CHECK (
    salon_id = get_user_salon_id()
  );

CREATE POLICY "Owners can delete discount codes"
  ON discount_codes FOR DELETE
  USING (
    salon_id = get_user_salon_id()
  );

-- Function to update updated_at timestamp
CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

