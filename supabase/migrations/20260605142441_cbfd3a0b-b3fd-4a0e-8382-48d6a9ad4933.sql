
-- saved_views: restrict to authenticated role and guard against NULL auth.uid()
DROP POLICY IF EXISTS "Users can view collaborative and their own views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can update their own views or collaborative views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can create their own views" ON public.saved_views;
DROP POLICY IF EXISTS "Users can delete their own views" ON public.saved_views;

CREATE POLICY "Users can view collaborative and their own views"
  ON public.saved_views FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR view_permission_type = 'collaborative'
    OR public.has_elevated_access(auth.uid())
  );

CREATE POLICY "Users can create their own views"
  ON public.saved_views FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own views or collaborative views"
  ON public.saved_views FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (view_permission_type = 'collaborative' AND view_permission_type <> 'locked')
    OR public.has_elevated_access(auth.uid())
  );

CREATE POLICY "Users can delete their own views"
  ON public.saved_views FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_elevated_access(auth.uid()));

-- job-quote-pos: replace open 'unassigned' upload exception with user-scoped path
DROP POLICY IF EXISTS "PO files: upload to owned quote" ON storage.objects;

CREATE POLICY "PO files: upload to owned quote"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-quote-pos'
    AND (
      public.has_elevated_access(auth.uid())
      OR (
        (storage.foldername(name))[1] = 'unassigned'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1 FROM public.job_quotes jq
        WHERE jq.id::text = (storage.foldername(objects.name))[1]
          AND (jq.created_by = auth.uid() OR jq.assigned_to_sales_rep_id = auth.uid())
      )
    )
  );
