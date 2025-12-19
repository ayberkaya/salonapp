-- Add new fields to customers table: province (il), district (ilçe), and date of birth (doğum_tarihi)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

