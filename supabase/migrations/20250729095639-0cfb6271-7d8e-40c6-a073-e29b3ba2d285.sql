-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  duration TEXT NOT NULL,
  enrolled BOOLEAN NOT NULL DEFAULT false,
  popular BOOLEAN NOT NULL DEFAULT false,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to courses
CREATE POLICY "Courses are publicly readable" 
ON public.courses 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to manage courses (admin only for now)
CREATE POLICY "Authenticated users can manage courses" 
ON public.courses 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample courses data
INSERT INTO public.courses (title, provider, category, level, duration, popular, image, description, topics, required_skills) VALUES
('UI/UX Design Fundamentals', 'DesignAcademy', 'Design', 'Beginner', '4 weeks', true, 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&auto=format&fit=crop&q=60', 'Learn the core principles of UI/UX design and how to create engaging user experiences.', '{"User Research", "Wireframing", "Prototyping", "Usability Testing"}', '{"Designer", "Creative"}'),

('Digital Marketing Mastery', 'MarketingPro', 'Marketing', 'Intermediate', '6 weeks', false, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60', 'Master digital marketing techniques and strategies across multiple platforms.', '{"Social Media Marketing", "SEO", "Email Campaigns", "Analytics"}', '{"Marketer", "Analyst"}'),

('React Frontend Development', 'CodeMasters', 'Tech', 'Intermediate', '8 weeks', true, 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&auto=format&fit=crop&q=60', 'Build modern web applications with React and related frontend technologies.', '{"React Components", "State Management", "Hooks", "Performance Optimization"}', '{"Developer", "Technical"}'),

('Business Strategy Fundamentals', 'BusinessSchool', 'Business', 'Beginner', '5 weeks', false, 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60', 'Learn the essentials of business strategy and management principles.', '{"Strategic Planning", "Market Analysis", "Competitive Advantage", "Business Models"}', '{"Project Manager", "Analyst"}'),

('Data Science Essentials', 'DataLearn', 'Tech', 'Advanced', '10 weeks', true, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60', 'Master the fundamentals of data science, from statistics to machine learning.', '{"Python for Data", "Statistical Analysis", "Machine Learning", "Data Visualization"}', '{"Developer", "Analyst"}'),

('Project Management Professional', 'PMI Institute', 'Management', 'Intermediate', '12 weeks', true, 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&auto=format&fit=crop&q=60', 'Comprehensive project management training covering methodologies and best practices.', '{"Agile/Scrum", "Risk Management", "Resource Planning", "Team Leadership"}', '{"Project Manager", "Leader"}'),

('Teaching and Training Skills', 'EduMasters', 'Education', 'Beginner', '6 weeks', false, 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60', 'Develop effective teaching and training skills for various learning environments.', '{"Learning Psychology", "Curriculum Design", "Assessment Methods", "Digital Tools"}', '{"Teacher", "Communicator"}'),

('Advanced JavaScript Programming', 'CodeMasters', 'Tech', 'Advanced', '10 weeks', true, 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800&auto=format&fit=crop&q=60', 'Deep dive into advanced JavaScript concepts and modern development practices.', '{"ES6+ Features", "Async Programming", "Design Patterns", "Performance Optimization"}', '{"Developer", "Technical"}');