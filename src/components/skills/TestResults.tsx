
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateSkillScores } from '@/utils/skillTestUtils';

interface SkillResult {
  skill: string;
  score: number;
  percentage: number;
}

interface TestResultsProps {
  showTitle?: boolean;
  compact?: boolean;
}

export function TestResults({ showTitle = true, compact = false }: TestResultsProps) {
  const { user } = useAuth();
  const [skillResults, setSkillResults] = useState<SkillResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      if (!user) return;

      try {
        // Fetch user's test answers
        const { data: answers, error } = await supabase
          .from('usertestanswers')
          .select('*')
          .eq('userid', user.id);

        if (error) {
          console.error('Error fetching test answers:', error);
          return;
        }

        if (!answers || answers.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate skill scores
        const skillScores = calculateSkillScores(answers);
        setTotalQuestions(answers.length);

        // Convert to results with percentages
        const results: SkillResult[] = Object.entries(skillScores)
          .map(([skill, score]) => ({
            skill,
            score: score as number,
            percentage: Math.round(((score as number) / answers.length) * 100)
          }))
          .sort((a, b) => b.score - a.score);

        setSkillResults(results);
      } catch (error) {
        console.error('Error calculating skill results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading test results...</div>
        </CardContent>
      </Card>
    );
  }

  if (skillResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No test results available. Take the skill assessment to see your results here.
          </div>
        </CardContent>
      </Card>
    );
  }

  const topSkills = skillResults.slice(0, 3);

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>Skill Assessment Results</CardTitle>
          <p className="text-sm text-gray-600">
            Based on {totalQuestions} questions answered
          </p>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {topSkills.map((result, index) => (
              <Badge 
                key={result.skill} 
                variant={index === 0 ? "default" : "secondary"}
                className={index === 0 ? "bg-breneo-blue" : ""}
              >
                {result.skill} ({result.percentage}%)
              </Badge>
            ))}
          </div>

          {!compact && (
            <div className="space-y-3">
              {skillResults.slice(0, 5).map((result) => (
                <div key={result.skill} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{result.skill}</span>
                    <span className="text-gray-600">{result.score}/{totalQuestions}</span>
                  </div>
                  <Progress value={result.percentage} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
