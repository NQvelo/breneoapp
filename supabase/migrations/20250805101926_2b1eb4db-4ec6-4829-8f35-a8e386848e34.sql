-- Add academy role to app_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'academy');
    ELSE
        -- Add academy to existing enum
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'academy';
    END IF;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create academy profiles table
CREATE TABLE public.academy_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    academy_name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    contact_email TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on academy_profiles
ALTER TABLE public.academy_profiles ENABLE ROW LEVEL SECURITY;

-- Add academy_id to courses table to track which academy uploaded the course
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academy_profiles(id);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_academy_course BOOLEAN DEFAULT FALSE;

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for academy_profiles
CREATE POLICY "Academy profiles are publicly readable" 
ON public.academy_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Academies can manage their own profile" 
ON public.academy_profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Update courses policies to allow academies to manage their courses
CREATE POLICY "Academies can manage their own courses" 
ON public.courses 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.academy_profiles WHERE id = academy_id
  )
);

-- Create trigger for academy profile timestamps
CREATE TRIGGER update_academy_profiles_updated_at
BEFORE UPDATE ON public.academy_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new academy user registration
CREATE OR REPLACE FUNCTION public.handle_new_academy_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert academy role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'academy');
  
  -- Insert academy profile if academy_name is provided in metadata
  IF NEW.raw_user_meta_data ->> 'academy_name' IS NOT NULL THEN
    INSERT INTO public.academy_profiles (
      user_id, 
      academy_name, 
      description,
      website_url,
      contact_email
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'academy_name',
      NEW.raw_user_meta_data ->> 'description',
      NEW.raw_user_meta_data ->> 'website_url',
      NEW.raw_user_meta_data ->> 'contact_email'
    );
  END IF;
  
  RETURN NEW;
END;
$$;