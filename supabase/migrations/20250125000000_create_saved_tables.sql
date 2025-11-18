-- Create saved_courses table if it doesn't exist
-- Use TEXT for course_id to support both UUID (Supabase courses) and numeric IDs (external courses)
CREATE TABLE IF NOT EXISTS public.saved_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- If saved_courses table already exists with UUID course_id, alter it to TEXT
-- This handles the case where the table was created before with UUID constraint
DO $$ 
BEGIN
  -- Check if course_id column exists and is UUID type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'saved_courses' 
    AND column_name = 'course_id'
    AND data_type = 'uuid'
  ) THEN
    -- Drop the foreign key constraint if it exists
    ALTER TABLE public.saved_courses 
    DROP CONSTRAINT IF EXISTS saved_courses_course_id_fkey;
    
    -- Alter the column type from UUID to TEXT
    ALTER TABLE public.saved_courses 
    ALTER COLUMN course_id TYPE TEXT USING course_id::TEXT;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own saved courses" ON public.saved_courses;
DROP POLICY IF EXISTS "Users can insert their own saved courses" ON public.saved_courses;
DROP POLICY IF EXISTS "Users can delete their own saved courses" ON public.saved_courses;

-- Create policies for saved_courses
CREATE POLICY "Users can view their own saved courses" 
ON public.saved_courses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved courses" 
ON public.saved_courses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved courses" 
ON public.saved_courses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create saved_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  job_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can insert their own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can delete their own saved jobs" ON public.saved_jobs;

-- Create policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs" 
ON public.saved_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved jobs" 
ON public.saved_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved jobs" 
ON public.saved_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_courses_user_id ON public.saved_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_courses_course_id ON public.saved_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

