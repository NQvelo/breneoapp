-- User industry profile cache: industry years derived from work experience.
-- Updated when user adds/edits/deletes work experience (or via nightly job).

CREATE TABLE IF NOT EXISTS public.user_industry_profile (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_years_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_industry_profile_updated_at
  ON public.user_industry_profile(updated_at);

COMMENT ON TABLE public.user_industry_profile IS 'Cache: industry -> years derived from work experience via company-industry map';
COMMENT ON COLUMN public.user_industry_profile.industry_years_json IS 'e.g. {"fintech": 2.5, "e-commerce": 0.8}';

-- RLS: users can read/update only their own row
ALTER TABLE public.user_industry_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own industry profile"
  ON public.user_industry_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own industry profile"
  ON public.user_industry_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own industry profile"
  ON public.user_industry_profile FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
