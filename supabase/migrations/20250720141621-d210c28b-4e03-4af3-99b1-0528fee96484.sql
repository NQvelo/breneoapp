-- Create table for dynamic skill test sessions
CREATE TABLE public.dynamic_skill_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{"questions": [], "answers": [], "current_question": 1, "status": "active"}'::jsonb,
  final_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.dynamic_skill_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tests" 
ON public.dynamic_skill_tests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tests" 
ON public.dynamic_skill_tests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tests" 
ON public.dynamic_skill_tests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tests" 
ON public.dynamic_skill_tests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dynamic_skill_tests_updated_at
BEFORE UPDATE ON public.dynamic_skill_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();