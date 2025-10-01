-- Update the handle_new_user function to automatically set dharris9928@gmail.com as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Determine the role based on email
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    CASE 
      WHEN new.email = 'dharris9928@gmail.com' THEN 'admin'::app_role
      ELSE 'sales_rep'::app_role  -- Default role for new users
    END
  );
  RETURN new;
END;
$function$;