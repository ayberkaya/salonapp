-- Add default services for existing salons
-- This migration adds common salon services with default prices

-- Function to insert default services for a salon
CREATE OR REPLACE FUNCTION add_default_services_for_salon(salon_uuid UUID, created_by_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default services if they don't exist
  INSERT INTO services (salon_id, name, default_price, is_active)
  VALUES
    (salon_uuid, 'Kesim', 150.00, true),
    (salon_uuid, 'Fön', 100.00, true),
    (salon_uuid, 'Boya', 300.00, true),
    (salon_uuid, 'Makyaj', 250.00, true),
    (salon_uuid, 'Kaş', 80.00, true),
    (salon_uuid, 'Kirpik', 200.00, true),
    (salon_uuid, 'Cilt Bakımı', 400.00, true),
    (salon_uuid, 'Masaj', 300.00, true),
    (salon_uuid, 'Manikür', 150.00, true),
    (salon_uuid, 'Pedikür', 200.00, true),
    (salon_uuid, 'Saç Bakımı', 180.00, true),
    (salon_uuid, 'Diğer', 100.00, true)
  ON CONFLICT (salon_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add default services for all existing salons
DO $$
DECLARE
  salon_record RECORD;
BEGIN
  FOR salon_record IN SELECT id FROM salons
  LOOP
    -- Get first owner profile for this salon
    PERFORM add_default_services_for_salon(
      salon_record.id,
      (SELECT id FROM profiles WHERE salon_id = salon_record.id AND role = 'OWNER' LIMIT 1)
    );
  END LOOP;
END $$;

