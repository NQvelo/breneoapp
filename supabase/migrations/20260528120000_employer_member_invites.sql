-- Employer team invites (admin invites by email; accept via token link).

CREATE TABLE IF NOT EXISTS public.employer_member_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  company_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_user_id TEXT,
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_member_invites_pending_email
  ON public.employer_member_invites (company_id, lower(invitee_email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_employer_member_invites_token
  ON public.employer_member_invites (token);

ALTER TABLE public.employer_member_invites ENABLE ROW LEVEL SECURITY;
