-- Add services column to visits table
ALTER TABLE visits 
ADD COLUMN services TEXT[] DEFAULT '{}';

-- Add index for better query performance
CREATE INDEX idx_visits_services ON visits USING GIN(services);

