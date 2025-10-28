-- Add about_me field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.about_me IS 'User biography or about me text';

