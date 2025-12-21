-- Add junction table for staff-services relationship
-- This allows staff members to be assigned to specific services they can provide

CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_services_staff_id ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id);

-- RLS Policies
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

-- Users can view staff-services in their salon
CREATE POLICY "Users can view staff-services in their salon"
  ON staff_services FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE salon_id = get_user_salon_id()
    )
  );

-- Staff and owners can manage staff-services in their salon
CREATE POLICY "Staff and owners can manage staff-services in their salon"
  ON staff_services FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE salon_id = get_user_salon_id()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE salon_id = get_user_salon_id()
    )
  );

