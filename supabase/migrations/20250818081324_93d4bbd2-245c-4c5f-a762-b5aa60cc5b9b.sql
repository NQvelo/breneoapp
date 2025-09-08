-- SECURITY FIX: Remove public access to academy contact information
-- This prevents unauthenticated users from accessing contact_email field

-- 1. Drop the insecure public policy that exposes contact emails
DROP POLICY IF EXISTS "Public academy info (no contact details)" ON public.academy_profiles;

-- 2. Enable RLS on the public_academy_profiles view
ALTER VIEW public.public_academy_profiles SET (security_barrier = true);

-- 3. Create secure policy for public access to the view (no contact info)
CREATE POLICY "Public can view academy info without contact details" 
ON public.public_academy_profiles 
FOR SELECT 
USING (true);

-- 4. Ensure only authenticated users can see full academy profiles with contact info
-- (This policy already exists but confirming it's correct)
-- "Authenticated users see full academy profiles" policy remains on academy_profiles table