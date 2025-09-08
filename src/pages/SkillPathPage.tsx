import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Target, 
  BookOpen, 
  Award, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';
import { getUserTestAnswers, calculateSkillScores, getTopSkills, generateRecommendations } from '@/utils/skillTestUtils';
import { supabase } from '@/integrations/supabase/client';

interface JobPath {
  title: string;
  description: string;
  matchPercentage: number;
  requiredSkills: string[];
  suggestedCourses: string[];
  certifications: string[];
  salaryRange: string;
  timeToReady: string;
}

interface CourseRecommendation {
  id: string;
  title: string;
  provider: string;
  level: string;
  duration: string;
  description: string;
  relevantSkills: string[];
}

const SkillPathPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [skillScores, setSkillScores] = useState<Record<string, number>>({});
  const [topSkills, setTopSkills] = useState<Array<{skill: string, score: number}>>([]);
  const [jobPaths, setJobPaths] = useState<JobPath[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<CourseRecommendation[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    loadSkillData();
  }, [user, navigate]);

  const loadSkillData = async () => {
    try {
      setLoading(true);
      
      // Get user's test answers
      const answers = await getUserTestAnswers(user!.id);
      if (!answers || answers.length === 0) {
        navigate('/skill-test');
        return;
      }

      // Calculate skill scores
      const scores = calculateSkillScores(answers);
      setSkillScores(scores);

      // Get top skills
      const top = getTopSkills(scores, 5);
      setTopSkills(top);

      // Generate job paths based on top skills
      const paths = generateJobPaths(top);
      setJobPaths(paths);

      // Get course recommendations
      const courses = await getCourseRecommendations(top.map(s => s.skill));
      setCourseRecommendations(courses);

    } catch (error) {
      console.error('Error loading skill data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateJobPaths = (skills: Array<{skill: string, score: number}>): JobPath[] => {
    const jobPathMap: Record<string, JobPath> = {
      'Developer': {
        title: 'Software Engineer',
        description: 'Build and maintain software applications using modern technologies.',
        matchPercentage: Math.min(95, skills.find(s => s.skill === 'Developer')?.score * 20 || 0),
        requiredSkills: ['Programming', 'Problem Solving', 'Version Control', 'Testing'],
        suggestedCourses: ['Full-Stack Development', 'Data Structures & Algorithms', 'System Design'],
        certifications: ['AWS Cloud Practitioner', 'Google Cloud Associate'],
        salaryRange: '$70,000 - $150,000',
        timeToReady: '6-12 months'
      },
      'Designer': {
        title: 'UX/UI Designer',
        description: 'Create intuitive and beautiful user interfaces and experiences.',
        matchPercentage: Math.min(95, skills.find(s => s.skill === 'Designer')?.score * 20 || 0),
        requiredSkills: ['Design Thinking', 'Prototyping', 'User Research', 'Visual Design'],
        suggestedCourses: ['UI/UX Design Fundamentals', 'Design Systems', 'User Research Methods'],
        certifications: ['Google UX Design Certificate', 'Adobe Certified Expert'],
        salaryRange: '$55,000 - $120,000',
        timeToReady: '4-8 months'
      },
      'Analyst': {
        title: 'Data Analyst',
        description: 'Transform data into actionable insights for business decisions.',
        matchPercentage: Math.min(95, skills.find(s => s.skill === 'Analyst')?.score * 20 || 0),
        requiredSkills: ['Data Analysis', 'SQL', 'Statistics', 'Data Visualization'],
        suggestedCourses: ['Data Analysis with Python', 'SQL for Data Science', 'Business Intelligence'],
        certifications: ['Microsoft Power BI', 'Tableau Desktop Specialist'],
        salaryRange: '$50,000 - $100,000',
        timeToReady: '3-6 months'
      },
      'Project Manager': {
        title: 'Product Manager',
        description: 'Lead product development and coordinate cross-functional teams.',
        matchPercentage: Math.min(95, skills.find(s => s.skill === 'Project Manager')?.score * 20 || 0),
        requiredSkills: ['Project Management', 'Strategic Thinking', 'Communication', 'Agile'],
        suggestedCourses: ['Product Management Fundamentals', 'Agile Methodologies', 'Leadership Skills'],
        certifications: ['PMP Certification', 'Scrum Master Certification'],
        salaryRange: '$80,000 - $160,000',
        timeToReady: '4-8 months'
      }
    };

    return skills
      .map(skill => jobPathMap[skill.skill])
      .filter(Boolean)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  };

  const getCourseRecommendations = async (skills: string[]): Promise<CourseRecommendation[]> => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .or(skills.map(skill => `required_skills.cs.{${skill}}`).join(','))
        .limit(6);

      if (error) throw error;

      return courses?.map(course => ({
        id: course.id,
        title: course.title,
        provider: course.provider,
        level: course.level,
        duration: course.duration,
        description: course.description,
        relevantSkills: course.required_skills || []
      })) || [];
    } catch (error) {
      console.error('Error fetching course recommendations:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Analyzing your skills...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Personalized Skill Path</h1>
          <p className="text-muted-foreground">
            Based on your assessment, here's your roadmap to career success
          </p>
        </div>

        {/* Skill Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Your Skill Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topSkills.map((skill, index) => (
                <div key={skill.skill} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{skill.skill}</span>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 && <Star className="h-3 w-3 mr-1" />}
                      {skill.score} points
                    </Badge>
                  </div>
                  <Progress value={(skill.score / Math.max(...topSkills.map(s => s.score))) * 100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Job Paths
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Recommended Courses
            </TabsTrigger>
            <TabsTrigger value="next-steps" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next Steps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {jobPaths.length > 0 ? (
              jobPaths.map((job, index) => (
                <Card key={job.title} className={index === 0 ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {job.title}
                          {index === 0 && <Badge variant="default">Best Match</Badge>}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1">{job.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{job.matchPercentage}%</div>
                        <div className="text-sm text-muted-foreground">Match</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Career Info</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Salary:</span> {job.salaryRange}</div>
                          <div><span className="font-medium">Time to Ready:</span> {job.timeToReady}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button className="w-full">
                        Start Learning Path
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Complete a skill assessment to see personalized job recommendations.</p>
                  <Button onClick={() => navigate('/skill-test')} className="mt-4">
                    Take Skill Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseRecommendations.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">by {course.provider}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{course.description}</p>
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary">{course.level}</Badge>
                      <span className="text-sm text-muted-foreground">{course.duration}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {course.relevantSkills.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full" variant="outline">
                      Start Course
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="next-steps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recommended Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobPaths[0]?.certifications.map((cert, index) => (
                    <div key={cert} className="flex items-center gap-3 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <h4 className="font-medium">{cert}</h4>
                        <p className="text-sm text-muted-foreground">
                          Industry-recognized certification for {jobPaths[0]?.title}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Learn More
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Learning Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Complete foundational courses</h4>
                      <p className="text-sm text-muted-foreground">Build your core skills (2-3 months)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Build portfolio projects</h4>
                      <p className="text-sm text-muted-foreground">Demonstrate your skills (1-2 months)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Earn relevant certifications</h4>
                      <p className="text-sm text-muted-foreground">Validate your expertise (1-2 months)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Apply for positions</h4>
                      <p className="text-sm text-muted-foreground">Start your career journey</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SkillPathPage;