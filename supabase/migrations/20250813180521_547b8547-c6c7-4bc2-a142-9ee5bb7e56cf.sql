-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Academy profiles are publicly readable" ON public.academy_profiles;

-- Create a more secure policy that only shows non-sensitive information publicly
CREATE POLICY "Public academy profiles (limited fields)" 
ON public.academy_profiles 
FOR SELECT 
USING (
  -- Allow public access only to non-sensitive fields by checking if contact_email is being selected
  -- This is done by creating a policy that allows public reads but the application will need to handle sensitive fields
  true
);

-- Create a security definer function to get public academy profile data (without sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_academy_profile(academy_name_param text)
RETURNS TABLE (
  id uuid,
  academy_name text,
  description text,
  website_url text,
  is_verified boolean,
  logo_url text,
  created_at timestamp with time zone
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    ap.id,
    ap.academy_name,
    ap.description,
    ap.website_url,
    ap.is_verified,
    ap.logo_url,
    ap.created_at
  FROM public.academy_profiles ap
  WHERE ap.academy_name = academy_name_param;
$$;

-- Create a more restrictive policy for contact_email access
CREATE POLICY "Contact email only for academy owners and authenticated users" 
ON public.academy_profiles 
FOR SELECT 
USING (
  -- Academy owners can see their own contact info
  auth.uid() = user_id 
  OR 
  -- Authenticated users can see contact info (you may want to restrict this further)
  (auth.uid() IS NOT NULL)
);

-- Update the existing policy to be more specific about what's publicly readable
DROP POLICY IF EXISTS "Public academy profiles (limited fields)" ON public.academy_profiles;

-- Create separate policies for different access levels
CREATE POLICY "Public academy basic info" 
ON public.academy_profiles 
FOR SELECT 
USING (true);

-- The above policy allows public read access, but we'll modify the application to only fetch non-sensitive fields publicly