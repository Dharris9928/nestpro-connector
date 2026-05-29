
DROP POLICY IF EXISTS "Authenticated users can log status changes" ON public.account_status_changes;
CREATE POLICY "Users can log their own status changes"
  ON public.account_status_changes FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert field access logs" ON public.field_access_audit_log;
CREATE POLICY "Users can insert their own field access logs"
  ON public.field_access_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_elevated_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert signup rate limits" ON public.signup_rate_limit;
CREATE POLICY "Authenticated users can insert signup rate limits"
  ON public.signup_rate_limit FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can view presentations via valid token" ON public.presentations;

DROP POLICY IF EXISTS "Admins can view all reset codes" ON public.password_reset_codes;

DROP POLICY IF EXISTS "Authenticated users can view PO files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PO files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PO files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PO files" ON storage.objects;

CREATE POLICY "PO files: view own or elevated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-quote-pos' AND (
      has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.job_quotes jq
        WHERE jq.id::text = (storage.foldername(name))[1]
          AND (jq.created_by = auth.uid() OR jq.assigned_to_sales_rep_id = auth.uid())
      )
    )
  );

CREATE POLICY "PO files: upload to owned quote"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-quote-pos' AND (
      has_elevated_access(auth.uid())
      OR (storage.foldername(name))[1] = 'unassigned'
      OR EXISTS (
        SELECT 1 FROM public.job_quotes jq
        WHERE jq.id::text = (storage.foldername(name))[1]
          AND (jq.created_by = auth.uid() OR jq.assigned_to_sales_rep_id = auth.uid())
      )
    )
  );

CREATE POLICY "PO files: update own or elevated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'job-quote-pos' AND (
      has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.job_quotes jq
        WHERE jq.id::text = (storage.foldername(name))[1]
          AND (jq.created_by = auth.uid() OR jq.assigned_to_sales_rep_id = auth.uid())
      )
    )
  );

CREATE POLICY "PO files: delete own or elevated"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-quote-pos' AND (
      has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.job_quotes jq
        WHERE jq.id::text = (storage.foldername(name))[1]
          AND (jq.created_by = auth.uid() OR jq.assigned_to_sales_rep_id = auth.uid())
      )
    )
  );
