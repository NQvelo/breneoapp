-- Self-reported applications to fetched (external ATS) jobs, recorded by BFF using service role.
CREATE TABLE IF NOT EXISTS public.external_job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  title TEXT,
  company_name TEXT,
  location TEXT,
  logo TEXT,
  apply_url TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_external_job_applications_user_applied
  ON public.external_job_applications (user_id, applied_at DESC);

ALTER TABLE public.external_job_applications ENABLE ROW LEVEL SECURITY;
