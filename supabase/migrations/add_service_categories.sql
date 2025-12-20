-- Add service categories system
-- This allows salons to organize services into categories

-- Service Categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(salon_id, name)
);

-- Add category_id to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_categories_salon_id ON service_categories(salon_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_display_order ON service_categories(salon_id, display_order);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Users can view service categories in their salon"
  ON service_categories FOR SELECT
  USING (salon_id = get_user_salon_id());

CREATE POLICY "Users can manage service categories in their salon"
  ON service_categories FOR ALL
  USING (salon_id = get_user_salon_id())
  WITH CHECK (salon_id = get_user_salon_id());

-- Insert default categories for existing salons
-- This will create default categories for all existing salons
DO $$
DECLARE
  salon_record RECORD;
  category_names TEXT[] := ARRAY['Saç', 'Tırnak', 'Makyaj', 'Ağda', 'Cilt Bakımı'];
  category_name TEXT;
  order_num INTEGER := 0;
BEGIN
  FOR salon_record IN SELECT id FROM salons LOOP
    order_num := 0;
    FOREACH category_name IN ARRAY category_names LOOP
      INSERT INTO service_categories (salon_id, name, display_order)
      VALUES (salon_record.id, category_name, order_num)
      ON CONFLICT (salon_id, name) DO NOTHING;
      order_num := order_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_categories_updated_at();

