
-- Create the dynamicTestQuestions table
CREATE TABLE public.dynamicTestQuestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questionId TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  questionText TEXT NOT NULL,
  options JSONB NOT NULL,
  "order" INTEGER,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the userTestAnswers table
CREATE TABLE public.userTestAnswers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionId TEXT NOT NULL,
  selectedLabel TEXT NOT NULL,
  relatedSkills TEXT[] NOT NULL,
  answeredAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(userId, questionId)
);

-- Create indexes for better performance
CREATE INDEX idx_dynamic_test_questions_question_id ON public.dynamicTestQuestions(questionId);
CREATE INDEX idx_dynamic_test_questions_category ON public.dynamicTestQuestions(category);
CREATE INDEX idx_dynamic_test_questions_active ON public.dynamicTestQuestions(isActive);
CREATE INDEX idx_dynamic_test_questions_order ON public.dynamicTestQuestions("order");
CREATE INDEX idx_user_test_answers_user_id ON public.userTestAnswers(userId);
CREATE INDEX idx_user_test_answers_question_id ON public.userTestAnswers(questionId);

-- Enable Row Level Security
ALTER TABLE public.dynamicTestQuestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userTestAnswers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dynamicTestQuestions
-- Allow everyone to read active questions (public test)
CREATE POLICY "Allow public read access to active test questions" 
  ON public.dynamicTestQuestions 
  FOR SELECT 
  USING (isActive = true);

-- Allow authenticated users to manage questions (admin functionality)
CREATE POLICY "Allow authenticated users to manage test questions" 
  ON public.dynamicTestQuestions 
  FOR ALL 
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for userTestAnswers
-- Users can only see and manage their own answers
CREATE POLICY "Users can view their own test answers" 
  ON public.userTestAnswers 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own test answers" 
  ON public.userTestAnswers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own test answers" 
  ON public.userTestAnswers 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete their own test answers" 
  ON public.userTestAnswers 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = userId);

-- Insert some sample questions to get started
INSERT INTO public.dynamicTestQuestions (questionId, category, questionText, options, "order") VALUES
('Q1', 'Problem-Solving', 'How do you usually approach a new challenge?', 
 '[
   {
     "label": "Break it into small tasks",
     "relatedSkills": ["Developer", "Analyst"],
     "nextQuestionId": "Q3"
   },
   {
     "label": "Visualize possible outcomes", 
     "relatedSkills": ["Designer"],
     "nextQuestionId": "Q4"
   },
   {
     "label": "Think about how people will react",
     "relatedSkills": ["Marketer"],
     "nextQuestionId": "Q5"
   },
   {
     "label": "Research existing solutions",
     "relatedSkills": ["Teacher", "Analyst"],
     "nextQuestionId": "Q6"
   }
 ]'::jsonb, 1),

('Q2', 'Personality', 'Which tool would you most enjoy using?',
 '[
   {
     "label": "Code editor",
     "relatedSkills": ["Developer"],
     "nextQuestionId": "Q7"
   },
   {
     "label": "Figma or Photoshop",
     "relatedSkills": ["Designer"],
     "nextQuestionId": "Q8"
   },
   {
     "label": "Google Analytics",
     "relatedSkills": ["Marketer", "Analyst"],
     "nextQuestionId": "Q9"
   },
   {
     "label": "Whiteboard and markers",
     "relatedSkills": ["Teacher", "Project Manager"],
     "nextQuestionId": "Q10"
   }
 ]'::jsonb, 2),

('Q3', 'Problem-Solving', 'What is your first instinct when something goes wrong in a project?',
 '[
   {
     "label": "Debug it myself",
     "relatedSkills": ["Developer"]
   },
   {
     "label": "Ask the team what happened",
     "relatedSkills": ["Project Manager"]
   },
   {
     "label": "Analyze user feedback",
     "relatedSkills": ["Marketer"]
   },
   {
     "label": "Try to explain what went wrong and how to avoid it",
     "relatedSkills": ["Teacher"]
   }
 ]'::jsonb, 3),

('Q4', 'Creativity', 'You enjoy tasks that are...',
 '[
   {
     "label": "Technically challenging",
     "relatedSkills": ["Developer"]
   },
   {
     "label": "Visually expressive",
     "relatedSkills": ["Designer"]
   },
   {
     "label": "Social and interactive",
     "relatedSkills": ["Marketer", "Project Manager"]
   },
   {
     "label": "Insightful and knowledge-based",
     "relatedSkills": ["Teacher", "Analyst"]
   }
 ]'::jsonb, 4),

('Q5', 'Communication', 'When presenting an idea, you focus on...',
 '[
   {
     "label": "Technical accuracy and implementation",
     "relatedSkills": ["Developer", "Analyst"]
   },
   {
     "label": "Visual impact and aesthetics",
     "relatedSkills": ["Designer"]
   },
   {
     "label": "Audience engagement and persuasion",
     "relatedSkills": ["Marketer"]
   },
   {
     "label": "Clear explanation and understanding",
     "relatedSkills": ["Teacher"]
   }
 ]'::jsonb, 5);

-- Create a trigger to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dynamic_test_questions_updated_at 
    BEFORE UPDATE ON public.dynamicTestQuestions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
