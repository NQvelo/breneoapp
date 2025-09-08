-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function to check for academy registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if this is an academy registration
  IF NEW.raw_user_meta_data ->> 'academy_name' IS NOT NULL THEN
    -- Handle academy user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'academy');
    
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
      COALESCE(NEW.raw_user_meta_data ->> 'contact_email', NEW.email)
    );
  ELSE
    -- Handle regular user
    INSERT INTO public.profiles (id, email, full_name, onboarding_completed, interests)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
      false,
      '{}'::text[]
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();