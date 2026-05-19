-- Employer company join requests (admin approves via BFF → staff-memberships).

CREATE TABLE IF NOT EXISTS public.employer_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  company_name TEXT NOT NULL,
  requester_user_id TEXT NOT NULL,
  requester_email TEXT NOT NULL DEFAULT '',
  requester_name TEXT NOT NULL DEFAULT '',
  requester_surname TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_join_requests_pending_unique
  ON public.employer_join_requests (company_id, requester_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_employer_join_requests_company_status
  ON public.employer_join_requests (company_id, status);

CREATE INDEX IF NOT EXISTS idx_employer_join_requests_requester
  ON public.employer_join_requests (requester_user_id, status);

ALTER TABLE public.employer_join_requests ENABLE ROW LEVEL SECURITY;

-- BFF uses service role; optional read for authenticated users on own rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employer_join_requests'
      AND policyname = 'Users can view own join requests'
  ) THEN
    CREATE POLICY "Users can view own join requests"
    ON public.employer_join_requests FOR SELECT
    USING (requester_user_id = auth.uid()::text);
  END IF;
END $$;
