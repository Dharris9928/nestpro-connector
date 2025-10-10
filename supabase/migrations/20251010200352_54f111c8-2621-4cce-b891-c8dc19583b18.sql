-- Fix contact_access_logs to allow NULL contact_id for profile-only access logs
-- This allows logging admin profile views without requiring a contact record

-- Make contact_id nullable
ALTER TABLE public.contact_access_logs 
ALTER COLUMN contact_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE public.contact_access_logs
DROP CONSTRAINT IF EXISTS contact_access_logs_contact_id_fkey;

-- Add a new foreign key constraint that allows NULL
ALTER TABLE public.contact_access_logs
ADD CONSTRAINT contact_access_logs_contact_id_fkey 
FOREIGN KEY (contact_id) 
REFERENCES public.contacts(id) 
ON DELETE CASCADE;

-- Drop and recreate the admin_get_all_profiles function with NULL contact_id
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  approval_status text,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Log the admin access with NULL contact_id (profile view, not contact view)
  INSERT INTO public.contact_access_logs (
    user_id,
    contact_id,
    log_type,
    ip_address,
    accessed_at
  ) VALUES (
    auth.uid(),
    NULL,  -- NULL for profile views that don't access specific contacts
    'ADMIN_PROFILE_VIEW',
    inet_client_addr(),
    now()
  );

  -- Return profiles with emails from auth.users
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.approval_status,
    p.created_at,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

COMMENT ON COLUMN public.contact_access_logs.contact_id IS 
'Foreign key to contacts table. NULL for profile-only access logs (e.g., ADMIN_PROFILE_VIEW) that do not access specific contact records.';