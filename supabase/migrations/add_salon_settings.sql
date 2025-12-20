-- Add salon settings fields
-- This migration adds working days and hours to the salons table

ALTER TABLE salons
ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']::TEXT[],
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '18:00:00';

-- Add comments for documentation
COMMENT ON COLUMN salons.working_days IS 'Salonun çalışma günleri (örn: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday])';
COMMENT ON COLUMN salons.opening_time IS 'Salonun açılış saati (örn: 09:00:00)';
COMMENT ON COLUMN salons.closing_time IS 'Salonun kapanış saati (örn: 18:00:00)';

