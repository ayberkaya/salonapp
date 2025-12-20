-- Add junction tables for multiple staff and services per appointment

-- Appointment Staff junction table
CREATE TABLE IF NOT EXISTS appointment_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, staff_id)
);

-- Appointment Services junction table
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, service_id)
);

-- Indexes for performance
CREATE INDEX idx_appointment_staff_appointment_id ON appointment_staff(appointment_id);
CREATE INDEX idx_appointment_staff_staff_id ON appointment_staff(staff_id);
CREATE INDEX idx_appointment_services_appointment_id ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service_id ON appointment_services(service_id);

-- RLS Policies
ALTER TABLE appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Users can view appointment staff in their salon
CREATE POLICY "Users can view appointment staff in their salon"
  ON appointment_staff FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  );

-- Staff and owners can manage appointment staff
CREATE POLICY "Staff and owners can manage appointment staff"
  ON appointment_staff FOR ALL
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  );

-- Users can view appointment services in their salon
CREATE POLICY "Users can view appointment services in their salon"
  ON appointment_services FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  );

-- Staff and owners can manage appointment services
CREATE POLICY "Staff and owners can manage appointment services"
  ON appointment_services FOR ALL
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE salon_id = get_user_salon_id()
    )
  );

