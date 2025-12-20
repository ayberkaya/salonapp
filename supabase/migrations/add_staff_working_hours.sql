-- Add working hours fields to staff table
-- This allows staff to have specific working hours that will be shown in the appointment calendar

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS work_start_time TIME,
ADD COLUMN IF NOT EXISTS work_end_time TIME;

-- Add comment for documentation
COMMENT ON COLUMN staff.work_start_time IS 'Personelin çalışma başlangıç saati (örn: 09:30)';
COMMENT ON COLUMN staff.work_end_time IS 'Personelin çalışma bitiş saati (örn: 18:00)';

