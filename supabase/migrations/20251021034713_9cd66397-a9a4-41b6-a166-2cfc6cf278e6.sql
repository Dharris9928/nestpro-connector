-- Create audit trigger function for opportunities if it doesn't exist
CREATE OR REPLACE FUNCTION audit_opportunities_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      new_values,
      ip_address
    ) VALUES (
      'opportunities',
      'INSERT',
      NEW.id,
      NEW.created_by,
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_values,
      new_values,
      ip_address
    ) VALUES (
      'opportunities',
      'UPDATE',
      NEW.id,
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_values,
      ip_address
    ) VALUES (
      'opportunities',
      'DELETE',
      OLD.id,
      auth.uid(),
      to_jsonb(OLD),
      inet_client_addr()
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS audit_opportunities_trigger ON opportunities;

CREATE TRIGGER audit_opportunities_trigger
AFTER INSERT OR UPDATE OR DELETE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION audit_opportunities_changes();

-- Create index on audit_logs for better performance when querying opportunities audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_opportunities 
ON audit_logs(table_name, record_id, created_at DESC) 
WHERE table_name = 'opportunities';