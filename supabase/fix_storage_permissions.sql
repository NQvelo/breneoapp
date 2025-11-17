-- Quick fix for course-images storage bucket permissions
-- Run this in Supabase SQL Editor if you're getting permission denied errors

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

-- Drop all existing policies for course-images to start fresh
DROP POLICY IF EXISTS "Allow public uploads to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete course images" ON storage.objects;

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that allow public access to course-images bucket
CREATE POLICY "Allow public uploads to course images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'course-images');

CREATE POLICY "Allow public read access to course images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-images');

CREATE POLICY "Allow public updates to course images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'course-images')
WITH CHECK (bucket_id = 'course-images');

CREATE POLICY "Allow public deletes to course images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'course-images');

