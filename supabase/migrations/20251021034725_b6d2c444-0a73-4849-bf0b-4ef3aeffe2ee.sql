-- Fix search path security issue for audit function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;