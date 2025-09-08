
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

// Comprehensive questions for skill assessment
const QUESTIONS = [
  // Problem-Solving & Thinking Style
  {
    id: 1,
    category: 'Problem-Solving & Thinking Style',
    question: 'How do you usually approach a new challenge?',
    options: [
      { id: 'a', text: 'Break it into small tasks', career: 'Developer / Analyst' },
      { id: 'b', text: 'Visualize possible outcomes', career: 'Designer' },
      { id: 'c', text: 'Think about how people will react', career: 'Marketer' },
      { id: 'd', text: 'Research existing solutions', career: 'Teacher / Analyst' }
    ]
  },
  {
    id: 2,
    category: 'Problem-Solving & Thinking Style',
    question: 'Which tool would you most enjoy using?',
    options: [
      { id: 'a', text: 'Code editor', career: 'Developer' },
      { id: 'b', text: 'Figma or Photoshop', career: 'Designer' },
      { id: 'c', text: 'Google Analytics', career: 'Marketer / Analyst' },
      { id: 'd', text: 'Whiteboard and markers', career: 'Educator / PM' }
    ]
  },
  {
    id: 3,
    category: 'Problem-Solving & Thinking Style',
    question: "What's your first instinct when something goes wrong in a project?",
    options: [
      { id: 'a', text: 'Debug it myself', career: 'Developer' },
      { id: 'b', text: 'Ask the team what happened', career: 'Project Manager' },
      { id: 'c', text: 'Analyze user feedback', career: 'Marketer' },
      { id: 'd', text: 'Try to explain what went wrong and how to avoid it', career: 'Teacher' }
    ]
  },
  {
    id: 4,
    category: 'Problem-Solving & Thinking Style',
    question: 'You enjoy tasks that are...',
    options: [
      { id: 'a', text: 'Technically challenging', career: 'Developer' },
      { id: 'b', text: 'Visually expressive', career: 'Designer' },
      { id: 'c', text: 'Social and interactive', career: 'Marketer / PM' },
      { id: 'd', text: 'Insightful and knowledge-based', career: 'Teacher / Analyst' }
    ]
  },
  {
    id: 5,
    category: 'Problem-Solving & Thinking Style',
    question: "You're asked to make a report. What do you focus on first?",
    options: [
      { id: 'a', text: 'Accuracy and structure', career: 'Analyst / Dev' },
      { id: 'b', text: 'Layout and colors', career: 'Designer' },
      { id: 'c', text: 'Persuasive headlines', career: 'Marketer' },
      { id: 'd', text: 'Making it easy to understand', career: 'Teacher' }
    ]
  },
  // Personality & Work Environment
  {
    id: 6,
    category: 'Personality & Work Environment',
    question: 'How do you feel about repetitive tasks?',
    options: [
      { id: 'a', text: 'I automate them', career: 'Developer' },
      { id: 'b', text: 'I get bored quickly', career: 'Designer / Marketer' },
      { id: 'c', text: 'I look for ways to improve them', career: 'PM / Analyst' },
      { id: 'd', text: 'I try to make them more engaging', career: 'Teacher' }
    ]
  },
  {
    id: 7,
    category: 'Personality & Work Environment',
    question: 'You prefer working...',
    options: [
      { id: 'a', text: 'Alone, deeply focused', career: 'Developer / Analyst' },
      { id: 'b', text: 'In teams, bouncing ideas', career: 'Marketer / PM' },
      { id: 'c', text: 'With visuals, creativity, and freedom', career: 'Designer' },
      { id: 'd', text: 'With learners or an audience', career: 'Teacher' }
    ]
  },
  {
    id: 8,
    category: 'Personality & Work Environment',
    question: 'When under pressure, you...',
    options: [
      { id: 'a', text: 'Stick to the plan', career: 'PM / Dev' },
      { id: 'b', text: 'Adapt and experiment', career: 'Designer / Marketer' },
      { id: 'c', text: 'Communicate openly with others', career: 'PM / Teacher' },
      { id: 'd', text: 'Analyze the situation and make data-backed choices', career: 'Analyst' }
    ]
  },
  {
    id: 9,
    category: 'Personality & Work Environment',
    question: 'You value work that is...',
    options: [
      { id: 'a', text: 'Efficient and scalable', career: 'Developer' },
      { id: 'b', text: 'Meaningful and helpful', career: 'Teacher' },
      { id: 'c', text: 'Trendy and high-impact', career: 'Marketer' },
      { id: 'd', text: 'Aesthetically pleasing', career: 'Designer' }
    ]
  },
  {
    id: 10,
    category: 'Personality & Work Environment',
    question: 'If you had to teach something, it would be...',
    options: [
      { id: 'a', text: 'A technical skill', career: 'Developer / Analyst' },
      { id: 'b', text: 'A creative process', career: 'Designer' },
      { id: 'c', text: 'Personal branding or communication', career: 'Marketer' },
      { id: 'd', text: 'A life lesson or moral', career: 'Teacher' }
    ]
  },
  // Creativity & Innovation
  {
    id: 11,
    category: 'Creativity & Innovation',
    question: 'Which activity sounds most exciting?',
    options: [
      { id: 'a', text: 'Creating an app', career: 'Developer' },
      { id: 'b', text: 'Designing a brand identity', career: 'Designer' },
      { id: 'c', text: 'Planning a viral campaign', career: 'Marketer' },
      { id: 'd', text: 'Writing an interactive lesson', career: 'Teacher' }
    ]
  },
  {
    id: 12,
    category: 'Creativity & Innovation',
    question: 'Where do you get your best ideas?',
    options: [
      { id: 'a', text: 'While solving problems', career: 'Developer / Analyst' },
      { id: 'b', text: 'When sketching or creating', career: 'Designer' },
      { id: 'c', text: 'During conversations or brainstorming', career: 'Marketer / PM' },
      { id: 'd', text: 'While reflecting or teaching', career: 'Teacher' }
    ]
  },
  {
    id: 13,
    category: 'Creativity & Innovation',
    question: 'Creativity means...',
    options: [
      { id: 'a', text: 'Building smart solutions', career: 'Developer' },
      { id: 'b', text: 'Expressing yourself visually', career: 'Designer' },
      { id: 'c', text: 'Capturing attention', career: 'Marketer' },
      { id: 'd', text: 'Finding new ways to explain or learn', career: 'Teacher' }
    ]
  },
  {
    id: 14,
    category: 'Creativity & Innovation',
    question: 'What motivates you the most?',
    options: [
      { id: 'a', text: 'Solving hard problems', career: 'Developer / Analyst' },
      { id: 'b', text: 'Creating something beautiful', career: 'Designer' },
      { id: 'c', text: 'Seeing your message spread', career: 'Marketer' },
      { id: 'd', text: 'Helping someone grow', career: 'Teacher' }
    ]
  },
  {
    id: 15,
    category: 'Creativity & Innovation',
    question: 'Your biggest strength is...',
    options: [
      { id: 'a', text: 'Logic', career: 'Developer / Analyst' },
      { id: 'b', text: 'Imagination', career: 'Designer' },
      { id: 'c', text: 'Communication', career: 'Marketer / PM' },
      { id: 'd', text: 'Patience', career: 'Teacher' }
    ]
  },
  // Preferences & Situational Thinking
  {
    id: 16,
    category: 'Preferences & Situational Thinking',
    question: "You're at a party. What are you doing?",
    options: [
      { id: 'a', text: 'Talking to a small group about a topic', career: 'Developer / Analyst' },
      { id: 'b', text: 'Admiring the design and mood', career: 'Designer' },
      { id: 'c', text: 'Networking and chatting with everyone', career: 'Marketer / PM' },
      { id: 'd', text: 'Observing, listening, offering thoughtful advice', career: 'Teacher' }
    ]
  },
  {
    id: 17,
    category: 'Preferences & Situational Thinking',
    question: 'Pick a word that describes you best:',
    options: [
      { id: 'a', text: 'Precise', career: 'Developer / Analyst' },
      { id: 'b', text: 'Expressive', career: 'Designer' },
      { id: 'c', text: 'Energetic', career: 'Marketer' },
      { id: 'd', text: 'Thoughtful', career: 'Teacher' }
    ]
  },
  {
    id: 18,
    category: 'Preferences & Situational Thinking',
    question: 'You have 1 hour free. What do you do?',
    options: [
      { id: 'a', text: 'Try coding something new', career: 'Developer' },
      { id: 'b', text: 'Doodle or design for fun', career: 'Designer' },
      { id: 'c', text: 'Make a social media post', career: 'Marketer' },
      { id: 'd', text: 'Watch a documentary or read', career: 'Teacher / Analyst' }
    ]
  },
  {
    id: 19,
    category: 'Preferences & Situational Thinking',
    question: 'When making decisions, you rely on...',
    options: [
      { id: 'a', text: 'Logic', career: 'Developer / Analyst' },
      { id: 'b', text: 'Visuals and emotion', career: 'Designer' },
      { id: 'c', text: 'Feedback from others', career: 'Marketer / PM' },
      { id: 'd', text: 'Experience and values', career: 'Teacher' }
    ]
  },
  {
    id: 20,
    category: 'Preferences & Situational Thinking',
    question: 'Which project would you pick?',
    options: [
      { id: 'a', text: 'Build a backend API', career: 'Developer' },
      { id: 'b', text: 'Redesign an app interface', career: 'Designer' },
      { id: 'c', text: 'Launch a product on social media', career: 'Marketer' },
      { id: 'd', text: 'Create a tutorial video', career: 'Teacher' }
    ]
  },
  // Soft Skills & Leadership
  {
    id: 21,
    category: 'Soft Skills & Leadership',
    question: 'In a team setting, you are usually the...',
    options: [
      { id: 'a', text: 'Technical executor', career: 'Developer' },
      { id: 'b', text: 'Visual creator', career: 'Designer' },
      { id: 'c', text: 'Idea launcher / Promoter', career: 'Marketer' },
      { id: 'd', text: 'Organizer / Coach', career: 'PM / Teacher' }
    ]
  },
  {
    id: 22,
    category: 'Soft Skills & Leadership',
    question: 'You prefer feedback that is...',
    options: [
      { id: 'a', text: 'Direct and logical', career: 'Developer' },
      { id: 'b', text: 'Constructive and visual', career: 'Designer' },
      { id: 'c', text: 'Encouraging and energetic', career: 'Marketer' },
      { id: 'd', text: 'Thoughtful and educational', career: 'Teacher' }
    ]
  },
  {
    id: 23,
    category: 'Soft Skills & Leadership',
    question: 'How do you handle conflict?',
    options: [
      { id: 'a', text: 'Solve it with logic and reason', career: 'Analyst / Dev' },
      { id: 'b', text: "Try to understand everyone's point of view", career: 'Teacher / PM' },
      { id: 'c', text: 'Mediate and find the win-win', career: 'Marketer / PM' },
      { id: 'd', text: 'Avoid it and focus on facts', career: 'Developer' }
    ]
  },
  {
    id: 24,
    category: 'Soft Skills & Leadership',
    question: "You're happiest when you...",
    options: [
      { id: 'a', text: 'Solve something no one else could', career: 'Developer' },
      { id: 'b', text: 'Bring an idea to life visually', career: 'Designer' },
      { id: 'c', text: 'Win attention with a great idea', career: 'Marketer' },
      { id: 'd', text: 'See others learn from you', career: 'Teacher' }
    ]
  },
  {
    id: 25,
    category: 'Soft Skills & Leadership',
    question: 'Pick your ideal meeting type:',
    options: [
      { id: 'a', text: 'None. I prefer async notes', career: 'Developer' },
      { id: 'b', text: 'Creative brainstorm', career: 'Designer' },
      { id: 'c', text: 'Quick standup with energy', career: 'Marketer' },
      { id: 'd', text: 'Interactive group discussion', career: 'Teacher / PM' }
    ]
  },
  // Lifestyle & Values
  {
    id: 26,
    category: 'Lifestyle & Values',
    question: 'How do you organize your day?',
    options: [
      { id: 'a', text: 'With structure and tasks', career: 'Developer / Analyst' },
      { id: 'b', text: 'Around inspiration or mood', career: 'Designer' },
      { id: 'c', text: 'With events, posts, or content ideas', career: 'Marketer' },
      { id: 'd', text: 'By planning classes or meetings', career: 'Teacher / PM' }
    ]
  },
  {
    id: 27,
    category: 'Lifestyle & Values',
    question: 'Success means...',
    options: [
      { id: 'a', text: 'Building something useful', career: 'Developer' },
      { id: 'b', text: 'Inspiring people with creativity', career: 'Designer' },
      { id: 'c', text: 'Reaching a large audience', career: 'Marketer' },
      { id: 'd', text: 'Changing lives or minds', career: 'Teacher' }
    ]
  },
  {
    id: 28,
    category: 'Lifestyle & Values',
    question: 'Your biggest fear at work:',
    options: [
      { id: 'a', text: 'Producing buggy or broken work', career: 'Developer' },
      { id: 'b', text: 'Creating something boring', career: 'Designer' },
      { id: 'c', text: 'Being ignored or unseen', career: 'Marketer' },
      { id: 'd', text: 'Misleading someone or failing to teach', career: 'Teacher' }
    ]
  },
  {
    id: 29,
    category: 'Lifestyle & Values',
    question: "You're most confident when...",
    options: [
      { id: 'a', text: 'Solving a tough technical problem', career: 'Developer' },
      { id: 'b', text: 'Designing visuals that wow people', career: 'Designer' },
      { id: 'c', text: 'Presenting your idea to a crowd', career: 'Marketer' },
      { id: 'd', text: 'Helping someone "get it"', career: 'Teacher' }
    ]
  },
  {
    id: 30,
    category: 'Lifestyle & Values',
    question: 'What would make you love your job?',
    options: [
      { id: 'a', text: 'Constant improvement and coding', career: 'Developer' },
      { id: 'b', text: 'Creative freedom', career: 'Designer' },
      { id: 'c', text: 'Audience impact and growth', career: 'Marketer' },
      { id: 'd', text: 'Purpose and mentorship', career: 'Teacher' }
    ]
  }
];

export function SkillTest() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (selectedOption) {
      // Save the answer
      setAnswers({ ...answers, [QUESTIONS[currentQuestion].id]: selectedOption });
      
      // Move to next question or finish test
      if (currentQuestion < QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
      } else {
        // Finish the test
        finishTest();
      }
    } else {
      toast({
        title: "Please select an option",
        variant: "destructive"
      });
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      // Get the previous answer if it exists
      const previousAnswer = answers[QUESTIONS[currentQuestion - 1].id];
      setSelectedOption(previousAnswer || null);
    }
  };

  const finishTest = () => {
    toast({
      title: "Test completed!",
      description: "Your personalized results are ready.",
    });
    navigate('/dashboard');
  };

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">Comprehensive Skill Assessment</h2>
          <span className="text-sm text-gray-500">
            {currentQuestion + 1} of {QUESTIONS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-gray-400 mt-1">
          Category: {QUESTIONS[currentQuestion].category}
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-medium mb-6">{QUESTIONS[currentQuestion].question}</h3>
        
        <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
          <div className="space-y-4">
            {QUESTIONS[currentQuestion].options.map((option) => (
              <div key={option.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                <div className="flex-1">
                  <label htmlFor={option.id} className="text-base cursor-pointer block">
                    {option.text}
                  </label>
                  <span className="text-xs text-gray-500 mt-1 block">
                    → {option.career}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="mt-8 flex justify-between">
          <Button 
            onClick={handlePrevious}
            variant="outline"
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            className="bg-breneo-blue hover:bg-breneo-blue/90"
          >
            {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish Test'}
          </Button>
        </div>
      </Card>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>This comprehensive test evaluates your skills across multiple dimensions to provide personalized career recommendations.</p>
      </div>
    </div>
  );
}
