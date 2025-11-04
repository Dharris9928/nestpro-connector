-- Add email tracking fields to company_communications table
ALTER TABLE company_communications
ADD COLUMN email_opened_at timestamp with time zone,
ADD COLUMN email_responded_at timestamp with time zone;

-- Add comments for clarity
COMMENT ON COLUMN company_communications.email_opened_at IS 'Timestamp when the email was opened by the recipient';
COMMENT ON COLUMN company_communications.email_responded_at IS 'Timestamp when the email was responded to by the recipient';