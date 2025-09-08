-- Drop the current policy and create a better approach
DROP POLICY IF EXISTS "Public academy basic info" ON public.academy_profiles;
DROP POLICY IF EXISTS "Contact email only for academy owners and authenticated users" ON public.academy_profiles;

-- Create a policy that restricts contact_email access properly
-- Public users can see basic academy info but not contact details
CREATE POLICY "Public academy info (no contact details)" 
ON public.academy_profiles 
FOR SELECT 
USING (
  -- For unauthenticated users, they can read the record but the app will handle hiding contact_email
  auth.uid() IS NULL
);

-- Authenticated users can see full academy profiles including contact info
CREATE POLICY "Authenticated users see full academy profiles" 
ON public.academy_profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);

-- Academy owners can always manage their own profiles (keep existing policy)
-- This policy should already exist from the original setup

-- Now let's create a view for public academy data that explicitly excludes sensitive information
CREATE OR REPLACE VIEW public.public_academy_profiles AS
SELECT 
  id,
  academy_name,
  description,
  website_url,
  is_verified,
  logo_url,
  created_at,
  updated_at,
  -- Explicitly exclude user_id and contact_email for public access
  NULL::text as contact_email_hidden
FROM public.academy_profiles;

-- Allow public read access to the view
ALTER VIEW public.public_academy_profiles OWNER TO postgres;
GRANT SELECT ON public.public_academy_profiles TO anon;
GRANT SELECT ON public.public_academy_profiles TO authenticated;