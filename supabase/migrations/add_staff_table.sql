-- Staff table for salon employees
-- Staff members are added by owners but cannot login to the system
-- They will be used for matching with customers in future invoice/receipt feature

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_salon_id ON staff(salon_id);
CREATE INDEX IF NOT EXISTS idx_staff_created_by ON staff(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view staff in their salon" ON staff;
DROP POLICY IF EXISTS "Owners can create staff in their salon" ON staff;
DROP POLICY IF EXISTS "Owners can update staff in their salon" ON staff;
DROP POLICY IF EXISTS "Owners can delete staff in their salon" ON staff;

-- Owners can view all staff in their salon
CREATE POLICY "Owners can view staff in their salon"
  ON staff FOR SELECT
  USING (salon_id = get_user_salon_id());

-- Owners can create staff in their salon
CREATE POLICY "Owners can create staff in their salon"
  ON staff FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Owners can update staff in their salon
CREATE POLICY "Owners can update staff in their salon"
  ON staff FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
  )
  WITH CHECK (
    salon_id = get_user_salon_id()
  );

-- Owners can delete staff in their salon
CREATE POLICY "Owners can delete staff in their salon"
  ON staff FOR DELETE
  USING (salon_id = get_user_salon_id());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_updated_at();

