-- Add email tracking fields to outreach_activities table
ALTER TABLE outreach_activities
ADD COLUMN email_opened_at timestamp with time zone,
ADD COLUMN email_responded_at timestamp with time zone;

-- Add comments for clarity
COMMENT ON COLUMN outreach_activities.email_opened_at IS 'Timestamp when the email was opened by the recipient';
COMMENT ON COLUMN outreach_activities.email_responded_at IS 'Timestamp when the email was responded to by the recipient';