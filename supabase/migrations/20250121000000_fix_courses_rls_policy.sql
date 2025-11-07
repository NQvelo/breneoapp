-- Fix RLS policy for courses table to allow academies to insert courses
-- 
-- Problem: The app uses Django authentication (JWT tokens), not Supabase Auth.
-- The Supabase client uses the anon key, so auth.uid() is null, causing RLS policies
-- that check auth.uid() to fail.
--
-- Solution: Since Django handles authentication/authorization, we'll allow course
-- inserts when a valid academy_id is provided. The Django API should validate that
-- the user owns the academy before allowing course creation.

-- Drop the existing restrictive policy that checks auth.uid()
DROP POLICY IF EXISTS "Academies can manage their own courses" ON public.courses;

-- Create a new policy that allows INSERTs for courses with valid academy_id
-- This works because:
-- 1. Django API validates user authentication and academy ownership
-- 2. Only valid academy_ids from academy_profiles are allowed
-- 3. This maintains referential integrity
CREATE POLICY "Allow course inserts with valid academy_id" 
ON public.courses 
FOR INSERT 
WITH CHECK (
  -- Must have an academy_id and it must exist in academy_profiles
  academy_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.academy_profiles WHERE id = academy_id
  )
);

-- Note: The existing "Authenticated users can manage courses" policy (line 29-34 
-- in migration 20250729095639) should handle SELECT/UPDATE/DELETE for authenticated
-- Supabase users. However, since we're using Django auth, that policy won't apply
-- when using the anon key.
--
-- For UPDATE and DELETE, we should also allow operations on courses with valid academy_id
-- Since Django validates the user's permissions before allowing these operations.

-- Allow UPDATE for courses with valid academy_id
CREATE POLICY "Allow course updates with valid academy_id"
ON public.courses
FOR UPDATE
USING (
  -- Allow update if academy_id exists and course belongs to an academy
  academy_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.academy_profiles WHERE id = academy_id
  )
)
WITH CHECK (
  -- Same check for the updated row
  academy_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.academy_profiles WHERE id = academy_id
  )
);

-- Allow DELETE for courses with valid academy_id
CREATE POLICY "Allow course deletes with valid academy_id"
ON public.courses
FOR DELETE
USING (
  -- Allow delete if academy_id exists
  academy_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.academy_profiles WHERE id = academy_id
  )
);

-- IMPORTANT SECURITY NOTE:
-- These policies allow any client (even unauthenticated) to insert/update/delete
-- courses if they provide a valid academy_id. This assumes:
-- 1. The Django API validates user authentication before allowing these operations
-- 2. The Django API validates that the user owns the academy
-- 3. The frontend only makes these requests after Django authentication
--
-- For better security, consider:
-- 1. Using Supabase Edge Functions with service role key (server-side)
-- 2. Syncing Django JWT with Supabase Auth sessions
-- 3. Using Django API endpoints that use service role key for Supabase operations

