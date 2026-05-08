-- Add error_message column to sms_logs for debugging failed sends
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
