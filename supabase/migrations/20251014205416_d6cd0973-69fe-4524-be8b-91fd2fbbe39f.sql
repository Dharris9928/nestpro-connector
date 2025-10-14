-- Create function to sync activities to communications table
CREATE OR REPLACE FUNCTION public.sync_activity_to_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  communication_type_mapped TEXT;
  activity_id UUID;
BEGIN
  -- Only sync certain activity types
  IF NEW.activity_type IN ('Email', 'Phone Call', 'LinkedIn Message', 'Meeting') THEN
    
    -- Map activity type to communication type
    communication_type_mapped := CASE
      WHEN NEW.activity_type = 'Email' THEN 'email'
      WHEN NEW.activity_type = 'Phone Call' THEN 'call_script'
      WHEN NEW.activity_type = 'LinkedIn Message' THEN 'linkedin_message'
      WHEN NEW.activity_type = 'Meeting' THEN 'call_script'
      ELSE NULL
    END;
    
    IF communication_type_mapped IS NOT NULL THEN
      -- Check if a communication already exists for this activity
      SELECT id INTO activity_id
      FROM public.company_communications
      WHERE notes LIKE '%Activity ID: ' || NEW.id::TEXT || '%';
      
      IF activity_id IS NULL AND TG_OP = 'INSERT' THEN
        -- Insert new communication
        INSERT INTO public.company_communications (
          company_id,
          contact_id,
          user_id,
          communication_type,
          subject,
          content,
          notes,
          used,
          sent_at,
          attempted_at,
          generated_at
        ) VALUES (
          NEW.company_id,
          NEW.contact_id,
          NEW.created_by,
          communication_type_mapped,
          NEW.subject_line,
          COALESCE(NEW.message_content, 'Activity: ' || NEW.activity_type),
          'Synced from activity. Activity ID: ' || NEW.id::TEXT || 
            CASE 
              WHEN NEW.notes IS NOT NULL THEN E'\n\nActivity Notes: ' || NEW.notes 
              ELSE '' 
            END,
          true,
          NEW.completed_date,
          COALESCE(NEW.completed_date, NEW.scheduled_date),
          COALESCE(NEW.completed_date, NEW.created_at, now())
        );
        
      ELSIF activity_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
        -- Update existing communication
        UPDATE public.company_communications
        SET
          contact_id = NEW.contact_id,
          subject = NEW.subject_line,
          content = COALESCE(NEW.message_content, 'Activity: ' || NEW.activity_type),
          notes = 'Synced from activity. Activity ID: ' || NEW.id::TEXT || 
            CASE 
              WHEN NEW.notes IS NOT NULL THEN E'\n\nActivity Notes: ' || NEW.notes 
              ELSE '' 
            END,
          sent_at = NEW.completed_date,
          attempted_at = COALESCE(NEW.completed_date, NEW.scheduled_date)
        WHERE id = activity_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for activities
DROP TRIGGER IF EXISTS sync_activity_to_communication_trigger ON public.outreach_activities;
CREATE TRIGGER sync_activity_to_communication_trigger
  AFTER INSERT OR UPDATE ON public.outreach_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activity_to_communication();

COMMENT ON FUNCTION public.sync_activity_to_communication() IS 
  'Syncs Email, Phone Call, LinkedIn Message, and Meeting activities to company_communications table';