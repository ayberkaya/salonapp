-- Invoice/Receipt System (Adisyon Sistemi)
-- This migration creates tables for managing invoices/receipts

-- Services table (predefined services with default prices)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(salon_id, name)
);

-- Invoices table (Adisyonlar)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(salon_id, invoice_number)
);

-- Invoice items table (Adisyon kalemleri)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice staff table (Hangi personel hangi adisyonda çalıştı)
CREATE TABLE IF NOT EXISTS invoice_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invoice_id, staff_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoices_salon_id ON invoices(salon_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(salon_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_staff_invoice_id ON invoice_staff(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_staff_staff_id ON invoice_staff(staff_id);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
DROP POLICY IF EXISTS "Users can view services in their salon" ON services;
CREATE POLICY "Users can view services in their salon"
  ON services FOR SELECT
  USING (salon_id = get_user_salon_id());

DROP POLICY IF EXISTS "Owners can manage services in their salon" ON services;
CREATE POLICY "Owners can manage services in their salon"
  ON services FOR ALL
  USING (salon_id = get_user_salon_id())
  WITH CHECK (salon_id = get_user_salon_id());

-- RLS Policies for invoices
DROP POLICY IF EXISTS "Users can view invoices in their salon" ON invoices;
CREATE POLICY "Users can view invoices in their salon"
  ON invoices FOR SELECT
  USING (salon_id = get_user_salon_id());

DROP POLICY IF EXISTS "Users can create invoices in their salon" ON invoices;
CREATE POLICY "Users can create invoices in their salon"
  ON invoices FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can update invoices in their salon" ON invoices;
CREATE POLICY "Users can update invoices in their salon"
  ON invoices FOR UPDATE
  USING (salon_id = get_user_salon_id())
  WITH CHECK (salon_id = get_user_salon_id());

DROP POLICY IF EXISTS "Users can delete invoices in their salon" ON invoices;
CREATE POLICY "Users can delete invoices in their salon"
  ON invoices FOR DELETE
  USING (salon_id = get_user_salon_id());

-- RLS Policies for invoice_items
DROP POLICY IF EXISTS "Users can view invoice items in their salon" ON invoice_items;
CREATE POLICY "Users can view invoice items in their salon"
  ON invoice_items FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  );

DROP POLICY IF EXISTS "Users can manage invoice items in their salon" ON invoice_items;
CREATE POLICY "Users can manage invoice items in their salon"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  )
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  );

-- RLS Policies for invoice_staff
DROP POLICY IF EXISTS "Users can view invoice staff in their salon" ON invoice_staff;
CREATE POLICY "Users can view invoice staff in their salon"
  ON invoice_staff FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  );

DROP POLICY IF EXISTS "Users can manage invoice staff in their salon" ON invoice_staff;
CREATE POLICY "Users can manage invoice staff in their salon"
  ON invoice_staff FOR ALL
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  )
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE salon_id = get_user_salon_id())
  );

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(salon_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  -- Format: SALON-YYYYMMDD-001
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get last invoice number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '(\d+)$') AS INTEGER)), 0)
  INTO last_number
  FROM invoices
  WHERE salon_id = salon_uuid
    AND invoice_number LIKE 'SALON-' || today_date || '-%';
  
  -- Generate new number
  new_number := 'SALON-' || today_date || '-' || LPAD((last_number + 1)::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update services updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update invoices updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

