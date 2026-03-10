
-- Fix 1: Prevent users from self-updating sensitive profile fields (approval_status, account_status)
-- RLS cannot restrict columns, so we use a validation trigger

CREATE OR REPLACE FUNCTION public.prevent_self_update_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the user is updating their own profile row
  IF NEW.id = auth.uid() THEN
    -- Only allow admins to change sensitive fields on their own profile
    IF NOT has_elevated_access(auth.uid()) THEN
      -- Prevent changing approval_status
      IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
        RAISE EXCEPTION 'You cannot modify your own approval status';
      END IF;
      -- Prevent changing account_status
      IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
        RAISE EXCEPTION 'You cannot modify your own account status';
      END IF;
      -- Prevent changing approved_at
      IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
        RAISE EXCEPTION 'You cannot modify your own approval timestamp';
      END IF;
      -- Prevent changing approved_by
      IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
        RAISE EXCEPTION 'You cannot modify your own approval metadata';
      END IF;
      -- Prevent changing role_frozen
      IF NEW.role_frozen IS DISTINCT FROM OLD.role_frozen THEN
        RAISE EXCEPTION 'You cannot modify your own role freeze status';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS prevent_self_update_sensitive_fields_trigger ON public.profiles;

-- Create trigger BEFORE UPDATE
CREATE TRIGGER prevent_self_update_sensitive_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_update_sensitive_fields();
