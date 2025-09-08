-- Drop the unused security definer function that bypasses RLS policies
-- This function was flagged as a security risk because it uses SECURITY DEFINER
-- and bypasses row-level security policies on the academy_profiles table
DROP FUNCTION IF EXISTS public.get_public_academy_profile(academy_name_param text);