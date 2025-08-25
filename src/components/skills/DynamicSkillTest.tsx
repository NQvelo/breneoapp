import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface TestSummary {
  strengths: string[];
  suggested_careers: string[];
  skill_gaps: string[];
  learning_recommendations: string[];
  summary: string;
}

export function DynamicSkillTest() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [questionOptions, setQuestionOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [finalSummary, setFinalSummary] = useState<TestSummary | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const startTest = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('dynamic-skill-test', {
        body: { action: 'start' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setQuestionOptions(data.options || []);
      setSelectedOption('');
      setHasStarted(true);
      
      toast({
        title: "Test started!",
        description: "Answer each question thoughtfully for the best results.",
      });
    } catch (error) {
      console.error('Error starting test:', error);
      toast({
        title: "Error",
        description: "Failed to start the test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedOption) {
      toast({
        title: "Please select an answer",
        description: "Choose one of the available options to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('dynamic-skill-test', {
        body: {
          action: 'next',
          sessionId,
          answer: selectedOption,
          questionNumber
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.completed) {
        // Test is finished
        try {
          const summary = typeof data.summary === 'string' 
            ? JSON.parse(data.summary) 
            : data.summary;
          setFinalSummary(summary);
          setIsCompleted(true);
        } catch (parseError) {
          console.error('Error parsing summary:', parseError);
          // Fallback for plain text summary
          setFinalSummary({
            strengths: [],
            suggested_careers: [],
            skill_gaps: [],
            learning_recommendations: [],
            summary: data.summary
          });
          setIsCompleted(true);
        }
      } else {
        // Continue with next question
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setQuestionOptions(data.options || []);
        setSelectedOption('');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit your answer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const restartTest = () => {
    setSessionId(null);
    setCurrentQuestion('');
    setQuestionNumber(0);
    setQuestionOptions([]);
    setSelectedOption('');
    setHasStarted(false);
    setIsCompleted(false);
    setFinalSummary(null);
  };

  // Start screen
  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-breneo-navy mb-4">
            AI-Powered Dynamic Skill Assessment
          </h2>
          <p className="text-gray-600 mb-6">
            This personalized test adapts based on your answers, using AI to generate 
            relevant questions that help identify your strengths and career potential.
          </p>
          <div className="space-y-4 text-left bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-breneo-navy">What to expect:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• 5 carefully curated questions from our dataset</li>
              <li>• Multiple choice format for easy answering</li>
              <li>• Questions designed to assess your skills and interests</li>
              <li>• AI-powered career analysis at the end</li>
              <li>• Takes approximately 5-10 minutes</li>
            </ul>
          </div>
          <Button 
            onClick={startTest}
            disabled={isLoading}
            className="bg-breneo-blue hover:bg-breneo-blue/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Test...
              </>
            ) : (
              'Start Assessment'
            )}
          </Button>
        </Card>
      </div>
    );
  }

  // Test completion screen
  if (isCompleted && finalSummary) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-breneo-navy mb-2">
              Your Skill Assessment Results
            </h2>
            <p className="text-gray-600">
              Based on your responses, here's your personalized career analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {finalSummary.strengths && finalSummary.strengths.length > 0 && (
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Your Strengths</h3>
                <ul className="space-y-2">
                  {finalSummary.strengths.map((strength, index) => (
                    <li key={index} className="text-green-700 text-sm">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {finalSummary.suggested_careers && finalSummary.suggested_careers.length > 0 && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Suggested Career Paths</h3>
                <ul className="space-y-2">
                  {finalSummary.suggested_careers.map((career, index) => (
                    <li key={index} className="text-blue-700 text-sm">
                      • {career}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {finalSummary.skill_gaps && finalSummary.skill_gaps.length > 0 && (
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-3">Areas for Growth</h3>
                <ul className="space-y-2">
                  {finalSummary.skill_gaps.map((gap, index) => (
                    <li key={index} className="text-orange-700 text-sm">
                      • {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {finalSummary.learning_recommendations && finalSummary.learning_recommendations.length > 0 && (
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-3">Learning Recommendations</h3>
                <ul className="space-y-2">
                  {finalSummary.learning_recommendations.map((rec, index) => (
                    <li key={index} className="text-purple-700 text-sm">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {finalSummary.summary && (
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">Detailed Analysis</h3>
              <p className="text-gray-700 leading-relaxed">{finalSummary.summary}</p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => navigate('/skill-path')}
              className="bg-breneo-blue hover:bg-breneo-blue/90"
            >
              View Your Skill Path
            </Button>
            <Button 
              onClick={restartTest}
              variant="outline"
            >
              Take Another Test
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Test in progress
  const progress = (questionNumber / 5) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">Dynamic Skill Assessment</h2>
          <span className="text-sm text-gray-500">
            Question {questionNumber} of 5
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-gray-400 mt-1">
          Curated questions from our skill assessment dataset
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-medium mb-6">{currentQuestion}</h3>
        
        <div className="space-y-4 mb-6">
          <RadioGroup 
            value={selectedOption} 
            onValueChange={setSelectedOption}
            disabled={isLoading}
            className="space-y-3"
          >
            {questionOptions.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={option.label || option} id={`option-${index}`} />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer leading-relaxed"
                >
                  {option.label || (typeof option === 'string' ? option : JSON.stringify(option))}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-sm text-gray-500">
            Select the option that best represents your response.
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={submitAnswer}
            disabled={isLoading || !selectedOption}
            className="bg-breneo-blue hover:bg-breneo-blue/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {questionNumber >= 5 ? 'Generating Results...' : 'Generating Next Question...'}
              </>
            ) : (
              questionNumber >= 5 ? 'Complete Assessment' : 'Next Question'
            )}
          </Button>
        </div>
      </Card>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Questions are carefully selected from our skill assessment database and analyzed by AI.</p>
      </div>
    </div>
  );
}
