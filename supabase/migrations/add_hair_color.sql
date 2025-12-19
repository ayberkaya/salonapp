-- Add hair_color column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS hair_color TEXT;

