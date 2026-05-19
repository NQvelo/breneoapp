-- Pending employer join requests (approved via BFF → staff-memberships POST).

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

CREATE INDEX IF NOT EXISTS idx_employer_join_requests_requester
  ON public.employer_join_requests (requester_user_id, status);

CREATE INDEX IF NOT EXISTS idx_employer_join_requests_company_status
  ON public.employer_join_requests (company_id, status);

ALTER TABLE public.employer_join_requests ENABLE ROW LEVEL SECURITY;

-- BFF uses service role; client reads via BFF only. Allow service role full access via bypass.
CREATE POLICY "Service role full access employer_join_requests"
  ON public.employer_join_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Notifications: allow insert for join-request workflow (BFF + client with Breneo user ids).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Allow insert notifications'
  ) THEN
    CREATE POLICY "Allow insert notifications"
      ON public.notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
