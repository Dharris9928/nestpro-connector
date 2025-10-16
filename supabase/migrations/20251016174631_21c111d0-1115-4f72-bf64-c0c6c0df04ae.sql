-- Phase 2: Team Membership & Analytics System

-- =====================================================
-- TEAM MEMBERSHIP TABLE
-- =====================================================
-- Allows sales managers to have team members (sales reps)
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(manager_id, team_member_id),
  -- Prevent self-assignment
  CHECK (manager_id != team_member_id)
);

-- Enable RLS
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_memberships
CREATE POLICY "Managers can view their team members"
  ON public.team_memberships
  FOR SELECT
  USING (
    manager_id = auth.uid() 
    OR team_member_id = auth.uid()
    OR has_elevated_access(auth.uid())
  );

CREATE POLICY "Managers and admins can manage team memberships"
  ON public.team_memberships
  FOR ALL
  USING (has_elevated_access(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_team_memberships_manager ON public.team_memberships(manager_id) WHERE is_active = true;
CREATE INDEX idx_team_memberships_member ON public.team_memberships(team_member_id) WHERE is_active = true;

-- =====================================================
-- PERSPECTIVE USAGE ANALYTICS TABLE
-- =====================================================
-- Track how users use perspective filters
CREATE TABLE IF NOT EXISTS public.perspective_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perspective_type TEXT NOT NULL CHECK (perspective_type IN ('my_records', 'assigned_to_me', 'my_team', 'all_records')),
  page_name TEXT NOT NULL CHECK (page_name IN ('companies', 'contacts', 'opportunities', 'activities')),
  record_count INTEGER,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perspective_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own analytics"
  ON public.perspective_usage_analytics
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own analytics"
  ON public.perspective_usage_analytics
  FOR SELECT
  USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

CREATE POLICY "Admins can view all analytics"
  ON public.perspective_usage_analytics
  FOR SELECT
  USING (has_elevated_access(auth.uid()));

-- Indexes
CREATE INDEX idx_perspective_analytics_user_date ON public.perspective_usage_analytics(user_id, created_at DESC);
CREATE INDEX idx_perspective_analytics_page ON public.perspective_usage_analytics(page_name, created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Get Team Member IDs
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_team_member_ids(_manager_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(team_member_id)
  FROM public.team_memberships
  WHERE manager_id = _manager_id
    AND is_active = true;
$$;

-- =====================================================
-- HELPER FUNCTION: Check if user is team member
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _manager_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE manager_id = _manager_id
      AND team_member_id = _user_id
      AND is_active = true
  );
$$;