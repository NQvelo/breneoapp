-- Create storage bucket for course images
-- This migration creates the 'course-images' bucket and sets up RLS policies

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true, -- Public bucket so images can be accessed via URL
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public uploads to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete course images" ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public uploads (Django handles authentication)
-- Since we're using Django auth with anon key, we need to allow public uploads
-- The Django API validates user permissions before allowing uploads
-- Files are organized by academy_id folder for organization
CREATE POLICY "Allow public uploads to course images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'course-images'
);

-- RLS Policy: Allow public read access to course images
CREATE POLICY "Allow public read access to course images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-images');

-- RLS Policy: Allow public updates (Django validates permissions)
CREATE POLICY "Allow public updates to course images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'course-images')
WITH CHECK (bucket_id = 'course-images');

-- RLS Policy: Allow public deletes (Django validates permissions)
CREATE POLICY "Allow public deletes to course images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'course-images');

-- Note: Since the app uses Django authentication (not Supabase Auth),
-- the 'authenticated' role might not work as expected when using the anon key.
-- For better security, consider:
-- 1. Using service role key on the backend (Django API) for storage operations
-- 2. Creating a Supabase Edge Function that validates Django JWT tokens
-- 3. Using the Django API to proxy storage uploads with proper authentication

