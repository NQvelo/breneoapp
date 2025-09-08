
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateSkillScores } from '@/utils/skillTestUtils';

interface SkillBasedJobFilterProps {
  onSkillsChange: (skills: string[]) => void;
  selectedSkills: string[];
}

export function SkillBasedJobFilter({ onSkillsChange, selectedSkills }: SkillBasedJobFilterProps) {
  const { user } = useAuth();
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's test answers
        const { data: answers, error } = await supabase
          .from('usertestanswers')
          .select('*')
          .eq('userid', user.id);

        if (error || !answers || answers.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate skill scores and get top skills
        const skillScores = calculateSkillScores(answers);
        const skills = Object.entries(skillScores)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([skill]) => skill);

        setTopSkills(skills);
      } catch (error) {
        console.error('Error fetching user skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter(s => s !== skill));
    } else {
      onSkillsChange([...selectedSkills, skill]);
    }
  };

  const selectAllMySkills = () => {
    onSkillsChange(topSkills);
  };

  const clearSkillFilters = () => {
    onSkillsChange([]);
  };

  if (loading || topSkills.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Your Top Skills</h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllMySkills}
            className="text-xs"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSkillFilters}
            className="text-xs"
          >
            Clear
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {topSkills.map((skill) => (
          <Badge
            key={skill}
            variant={selectedSkills.includes(skill) ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              selectedSkills.includes(skill) 
                ? "bg-breneo-blue hover:bg-breneo-blue/90" 
                : "hover:bg-gray-100"
            }`}
            onClick={() => toggleSkill(skill)}
          >
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}
