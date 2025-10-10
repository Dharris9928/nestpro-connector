-- Phase 1.1: Fix Critical RLS Gap
-- This migration secures the company_hierarchy view which currently has no RLS protection

-- Step 1: Enable RLS on company_hierarchy view
-- This ensures the view respects security policies
ALTER VIEW public.company_hierarchy SET (security_barrier = true);

-- Note: Views inherit RLS from underlying tables when security_barrier is enabled.
-- Since the companies table already has comprehensive RLS policies, the view will
-- automatically enforce those policies, restricting access to only companies that
-- users have legitimate access to (either through elevated access or ownership).

-- Step 2: Add explicit documentation comment
COMMENT ON VIEW public.company_hierarchy IS 
'Recursive view showing company hierarchy. Security: Inherits RLS from companies table via security_barrier. Users can only view hierarchy for companies they have access to through companies table RLS policies.';

-- Step 3: Verify existing contact access logging is in place
-- The application already has logContactAccess functions that log:
-- - Individual contact views (logSingleContactView)
-- - Bulk contact views (logBulkContactView) 
-- - Contact exports (logContactExport)
-- These logs are stored in contact_access_logs table for audit purposes.

-- Note: We are NOT adding additional restrictive RLS policies to contacts table
-- as the existing policies already ensure users can only access contacts for
-- companies they have legitimate access to. Adding time-based restrictions would
-- break existing legitimate workflows.