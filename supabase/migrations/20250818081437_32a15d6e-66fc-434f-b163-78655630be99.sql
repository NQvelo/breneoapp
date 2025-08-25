-- SECURITY FIX: Remove public access to academy contact information
-- This prevents unauthenticated users from accessing contact_email field

-- Remove the insecure public policy that exposes contact emails
DROP POLICY IF EXISTS "Public academy info (no contact details)" ON public.academy_profiles;

-- Now only authenticated users can access the full academy_profiles table
-- Unauthenticated users must use the public_academy_profiles view which excludes contact info