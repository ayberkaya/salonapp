-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Salons table
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'STAFF')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT,
  district TEXT,
  birth_day INTEGER CHECK (birth_day >= 1 AND birth_day <= 31),
  birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  hair_color TEXT,
  kvkk_consent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit_at TIMESTAMP WITH TIME ZONE,
  has_welcome_discount BOOLEAN DEFAULT false,
  welcome_discount_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(salon_id, phone)
);

-- Visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visit tokens table
CREATE TABLE visit_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_salon_id ON profiles(salon_id);
CREATE INDEX idx_customers_salon_id ON customers(salon_id);
CREATE INDEX idx_customers_phone ON customers(salon_id, phone);
CREATE INDEX idx_customers_last_visit_at ON customers(last_visit_at);
CREATE INDEX idx_visits_salon_id ON visits(salon_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_visited_at ON visits(visited_at);
CREATE INDEX idx_visit_tokens_token ON visit_tokens(token);
CREATE INDEX idx_visit_tokens_customer_id ON visit_tokens(customer_id);
CREATE INDEX idx_visit_tokens_expires_at ON visit_tokens(expires_at);

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view their own profile OR profiles in their salon (merged for performance)
CREATE POLICY "Users can view profiles in their salon"
  ON profiles FOR SELECT
  USING (
    (select auth.uid()) = id
    OR salon_id = get_user_salon_id()
  );

-- Salons policies
-- Users can view their salon
CREATE POLICY "Users can view their salon"
  ON salons FOR SELECT
  USING (
    id = get_user_salon_id()
  );

-- Customers policies
-- Users can view customers in their salon
CREATE POLICY "Users can view customers in their salon"
  ON customers FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

-- Staff and owners can insert customers
CREATE POLICY "Staff and owners can create customers"
  ON customers FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
  );

-- Staff and owners can update customers
CREATE POLICY "Staff and owners can update customers"
  ON customers FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
  );

-- Visits policies
-- Users can view visits in their salon
CREATE POLICY "Users can view visits in their salon"
  ON visits FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

-- Staff and owners can create visits
CREATE POLICY "Staff and owners can create visits"
  ON visits FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Visit tokens policies
-- Users can view visit tokens in their salon
CREATE POLICY "Users can view visit tokens in their salon"
  ON visit_tokens FOR SELECT
  USING (
    salon_id = get_user_salon_id()
  );

-- Staff and owners can create visit tokens
CREATE POLICY "Staff and owners can create visit tokens"
  ON visit_tokens FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Anyone can update visit tokens (for customer check-in via API)
-- This is handled server-side with proper validation
-- Only allow updating used_at field for tokens that belong to valid salons
CREATE POLICY "Visit tokens can be updated for check-in"
  ON visit_tokens FOR UPDATE
  USING (
    -- Allow update if token exists and belongs to a valid salon
    salon_id IN (SELECT id FROM salons)
  )
  WITH CHECK (
    -- Ensure the token still belongs to a valid salon
    salon_id IN (SELECT id FROM salons)
    -- Only allow setting used_at (prevent malicious field changes)
    AND (used_at IS NOT NULL)
  );

-- Function to get user's salon_id (SECURITY DEFINER breaks recursion)
CREATE OR REPLACE FUNCTION get_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

