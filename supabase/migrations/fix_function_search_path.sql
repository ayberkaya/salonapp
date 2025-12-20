-- Fix Function Search Path Security Issues
-- This migration fixes function_search_path_mutable warnings by setting search_path
-- for all database functions to prevent security vulnerabilities

-- Fix get_user_salon_id function
CREATE OR REPLACE FUNCTION get_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix calculate_loyalty_level function (if it exists)
-- This function calculates loyalty level based on visit count
CREATE OR REPLACE FUNCTION calculate_loyalty_level(visit_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF visit_count >= 30 THEN
    RETURN 'PLATINUM';
  ELSIF visit_count >= 20 THEN
    RETURN 'GOLD';
  ELSIF visit_count >= 10 THEN
    RETURN 'SILVER';
  ELSE
    RETURN 'BRONZE';
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix get_loyalty_discount function (if it exists)
-- This function returns discount percentage for a loyalty level
CREATE OR REPLACE FUNCTION get_loyalty_discount(level TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE level
    WHEN 'PLATINUM' THEN RETURN 25;
    WHEN 'GOLD' THEN RETURN 20;
    WHEN 'SILVER' THEN RETURN 15;
    WHEN 'BRONZE' THEN RETURN 10;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix generate_referral_code function (if it exists)
-- This function generates a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-character uppercase code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM customers WHERE referral_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

