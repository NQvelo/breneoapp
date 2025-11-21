import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import {
  Brain,
  Target,
  BookOpen,
  Award,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Star,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Code,
  Database,
  Cpu,
  Palette,
  Zap,
  Users,
  MessageSquare,
  Shield,
  Globe,
  Settings,
  Rocket,
} from "lucide-react";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
  generateRecommendations,
} from "@/utils/skillTestUtils";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/api/auth/apiClient";

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

interface MissingSkill {
  skill: string;
  category: "tech" | "soft";
  importance: "high" | "medium" | "low";
  requiredByJobs: string[];
  recommendedCourses: CourseRecommendation[];
  frequency: number; // How many job paths require this skill
}

const SkillPathPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasTestAnswers, setHasTestAnswers] = useState(false);
  const [skillScores, setSkillScores] = useState<Record<string, number>>({});
  const [topSkills, setTopSkills] = useState<
    Array<{ skill: string; score: number }>
  >([]);
  const [techSkills, setTechSkills] = useState<Record<string, string>>({});
  const [softSkills, setSoftSkills] = useState<Record<string, string>>({});
  const [jobPaths, setJobPaths] = useState<JobPath[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<
    CourseRecommendation[]
  >([]);
  const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
  const [finalRole, setFinalRole] = useState<string | null>(null);

  const loadSkillData = useCallback(async () => {
    try {
      console.log("🚀 Starting loadSkillData");
      setLoading(true);

      // Method 1: Try Django backend skill test results API (same as ProfilePage)
      try {
        console.log("📡 Attempting Django API call...");
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user!.id}`
        );
        console.log("🔍 SkillPathPage - Checking Django API:", response.data);

        let skillTestData = null;
        if (Array.isArray(response.data) && response.data.length > 0) {
          skillTestData = response.data[0];
        } else if (response.data && typeof response.data === "object") {
          skillTestData = response.data;
        }

        if (
          skillTestData &&
          (skillTestData.final_role || skillTestData.skills_json)
        ) {
          console.log("✅ Found skill test results from Django API");
          setHasTestAnswers(true);

          // Store final_role if available
          if (skillTestData.final_role) {
            setFinalRole(skillTestData.final_role);
          }

          // Extract skills from skills_json for display
          const skillsJson = skillTestData.skills_json || {};

          // Store tech and soft skills separately for the boxes
          setTechSkills(skillsJson.tech || {});
          setSoftSkills(skillsJson.soft || {});

          const techSkillsArray = Object.entries(skillsJson.tech || {}).map(
            ([skill, pct]) => ({
              skill,
              score: parseFloat(String(pct).replace("%", "")) || 0,
            })
          );
          const softSkillsArray = Object.entries(skillsJson.soft || {}).map(
            ([skill, pct]) => ({
              skill,
              score: parseFloat(String(pct).replace("%", "")) || 0,
            })
          );
          const allSkills = [...techSkillsArray, ...softSkillsArray].sort(
            (a, b) => b.score - a.score
          );

          const top = allSkills.slice(0, 5);
          setTopSkills(top);

          // Generate job paths and course recommendations
          const paths = generateJobPaths(top);
          setJobPaths(paths);

          const courses = await getCourseRecommendations(
            top.map((s) => s.skill)
          );
          setCourseRecommendations(courses);

          // Identify missing skills and fetch courses for them
          const missing = await identifyMissingSkills(
            Object.keys(skillsJson.tech || {}),
            Object.keys(skillsJson.soft || {}),
            paths
          );
          setMissingSkills(missing);

          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log("Django API not available, trying Supabase...");
      }

      // Method 2: Fallback to Supabase: fetch from usertestanswers
      const answers = await getUserTestAnswers(user!.id);
      console.log("🔍 SkillPathPage - Checking Supabase test answers:", {
        userId: user!.id,
        answersCount: answers?.length || 0,
        hasAnswers: answers && answers.length > 0,
      });

      if (!answers || answers.length === 0) {
        console.log("❌ No test answers found for user");
        setHasTestAnswers(false);
        setLoading(false);
        return;
      }

      console.log("✅ Test answers found, loading skill path data");
      setHasTestAnswers(true);

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
      const courses = await getCourseRecommendations(top.map((s) => s.skill));
      setCourseRecommendations(courses);

      // Identify missing skills and fetch courses for them
      const userSkillNames = top.map((s) => s.skill);
      const missing = await identifyMissingSkills(userSkillNames, [], paths);
      setMissingSkills(missing);
    } catch (error) {
      console.error("❌ Error loading skill data:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : String(error)
      );
      setHasTestAnswers(false);
    } finally {
      // Ensure loading is always set to false
      console.log("🏁 loadSkillData finished - setting loading to false");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log("🔍 SkillPathPage useEffect - User:", user?.id);
    if (!user) {
      console.log("❌ No user, redirecting to login");
      navigate("/auth/login");
      return;
    }
    console.log("✅ User found, loading skill data");
    loadSkillData();
  }, [user, navigate, loadSkillData]);

  const generateJobPaths = (
    skills: Array<{ skill: string; score: number }>
  ): JobPath[] => {
    const jobPathMap: Record<string, JobPath> = {
      Developer: {
        title: "Software Engineer",
        description:
          "Build and maintain software applications using modern technologies.",
        matchPercentage: Math.min(
          95,
          skills.find((s) => s.skill === "Developer")?.score * 20 || 0
        ),
        requiredSkills: [
          "Programming",
          "Problem Solving",
          "Version Control",
          "Testing",
        ],
        suggestedCourses: [
          "Full-Stack Development",
          "Data Structures & Algorithms",
          "System Design",
        ],
        certifications: ["AWS Cloud Practitioner", "Google Cloud Associate"],
        salaryRange: "$70,000 - $150,000",
        timeToReady: "6-12 months",
      },
      Designer: {
        title: "UX/UI Designer",
        description:
          "Create intuitive and beautiful user interfaces and experiences.",
        matchPercentage: Math.min(
          95,
          skills.find((s) => s.skill === "Designer")?.score * 20 || 0
        ),
        requiredSkills: [
          "Design Thinking",
          "Prototyping",
          "User Research",
          "Visual Design",
        ],
        suggestedCourses: [
          "UI/UX Design Fundamentals",
          "Design Systems",
          "User Research Methods",
        ],
        certifications: [
          "Google UX Design Certificate",
          "Adobe Certified Expert",
        ],
        salaryRange: "$55,000 - $120,000",
        timeToReady: "4-8 months",
      },
      Analyst: {
        title: "Data Analyst",
        description:
          "Transform data into actionable insights for business decisions.",
        matchPercentage: Math.min(
          95,
          skills.find((s) => s.skill === "Analyst")?.score * 20 || 0
        ),
        requiredSkills: [
          "Data Analysis",
          "SQL",
          "Statistics",
          "Data Visualization",
        ],
        suggestedCourses: [
          "Data Analysis with Python",
          "SQL for Data Science",
          "Business Intelligence",
        ],
        certifications: ["Microsoft Power BI", "Tableau Desktop Specialist"],
        salaryRange: "$50,000 - $100,000",
        timeToReady: "3-6 months",
      },
      "Project Manager": {
        title: "Product Manager",
        description:
          "Lead product development and coordinate cross-functional teams.",
        matchPercentage: Math.min(
          95,
          skills.find((s) => s.skill === "Project Manager")?.score * 20 || 0
        ),
        requiredSkills: [
          "Project Management",
          "Strategic Thinking",
          "Communication",
          "Agile",
        ],
        suggestedCourses: [
          "Product Management Fundamentals",
          "Agile Methodologies",
          "Leadership Skills",
        ],
        certifications: ["PMP Certification", "Scrum Master Certification"],
        salaryRange: "$80,000 - $160,000",
        timeToReady: "4-8 months",
      },
    };

    return skills
      .map((skill) => jobPathMap[skill.skill])
      .filter(Boolean)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  };

  const getCourseRecommendations = async (
    skills: string[]
  ): Promise<CourseRecommendation[]> => {
    try {
      if (skills.length === 0) return [];

      const { data: courses, error } = await supabase
        .from("courses")
        .select("*")
        .or(skills.map((skill) => `required_skills.cs.{${skill}}`).join(","))
        .limit(6);

      if (error) throw error;

      return (
        courses?.map((course) => ({
          id: course.id,
          title: course.title,
          provider: course.provider,
          level: course.level,
          duration: course.duration,
          description: course.description,
          relevantSkills: course.required_skills || [],
        })) || []
      );
    } catch (error) {
      console.error("Error fetching course recommendations:", error);
      return [];
    }
  };

  // Identify missing skills by comparing user skills with job requirements
  const identifyMissingSkills = async (
    userTechSkills: string[],
    userSoftSkills: string[],
    jobPaths: JobPath[]
  ): Promise<MissingSkill[]> => {
    // Normalize user skills to lowercase for comparison
    const allUserSkills = [...userTechSkills, ...userSoftSkills].map((s) =>
      s.toLowerCase().trim()
    );

    // Collect all required skills from job paths with frequency
    const skillFrequency = new Map<string, { jobs: string[]; count: number }>();

    jobPaths.forEach((job) => {
      job.requiredSkills.forEach((skill) => {
        const skillLower = skill.toLowerCase().trim();
        if (!allUserSkills.includes(skillLower)) {
          if (!skillFrequency.has(skillLower)) {
            skillFrequency.set(skillLower, { jobs: [], count: 0 });
          }
          const entry = skillFrequency.get(skillLower)!;
          entry.jobs.push(job.title);
          entry.count++;
        }
      });
    });

    if (skillFrequency.size === 0) {
      return [];
    }

    // Fetch all courses to find ones that teach missing skills
    const { data: allCourses, error } = await supabase
      .from("courses")
      .select("*")
      .limit(100); // Get a good sample of courses

    const coursesMap = new Map<string, CourseRecommendation[]>();

    if (!error && allCourses) {
      allCourses.forEach((course) => {
        const courseSkills = (course.required_skills || []).map((s: string) =>
          s.toLowerCase().trim()
        );
        courseSkills.forEach((skill) => {
          if (skillFrequency.has(skill)) {
            if (!coursesMap.has(skill)) {
              coursesMap.set(skill, []);
            }
            coursesMap.get(skill)!.push({
              id: course.id,
              title: course.title,
              provider: course.provider || "Unknown",
              level: course.level || "Beginner",
              duration: course.duration || "N/A",
              description: course.description || "",
              relevantSkills: course.required_skills || [],
            });
          }
        });
      });
    }

    // Build missing skills array
    const missingSkillsArray: MissingSkill[] = Array.from(
      skillFrequency.entries()
    ).map(([skill, data]) => {
      // Determine category (tech vs soft) - simple heuristic
      const techKeywords = [
        "programming",
        "code",
        "sql",
        "testing",
        "version control",
        "data",
        "api",
        "framework",
        "database",
        "algorithm",
        "software",
        "technical",
      ];
      const isTech = techKeywords.some((keyword) => skill.includes(keyword));

      // Determine importance based on frequency
      let importance: "high" | "medium" | "low" = "medium";
      if (data.count >= 3) {
        importance = "high";
      } else if (data.count === 1) {
        importance = "low";
      }

      return {
        skill: skill.charAt(0).toUpperCase() + skill.slice(1), // Capitalize first letter
        category: isTech ? "tech" : "soft",
        importance,
        requiredByJobs: [...new Set(data.jobs)], // Remove duplicates
        recommendedCourses: coursesMap.get(skill) || [],
        frequency: data.count,
      };
    });

    // Sort by importance and frequency
    return missingSkillsArray.sort((a, b) => {
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      if (importanceOrder[b.importance] !== importanceOrder[a.importance]) {
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      }
      return b.frequency - a.frequency;
    });
  };

  // Render skills as a modern vertical bar chart with primary color and opacity
  const renderSkillsChart = (skills: Record<string, string>, title: string) => {
    const primaryColor = "#19B5FE"; // breneo-blue (primary color)

    const chartData = Object.entries(skills)
      .filter(([_, pct]) => parseFloat(String(pct).replace("%", "")) > 0)
      .map(([skill, pct]) => {
        const percentage = parseFloat(String(pct).replace("%", ""));

        // Calculate opacity based on percentage
        // If >= 80%, use full opacity (1.0)
        // Otherwise, scale opacity from 0.3 to 1.0 based on percentage
        let opacity: number;
        if (percentage >= 80) {
          opacity = 1.0; // Full opacity for strong skills
        } else {
          // Scale from 30% to 80%: opacity ranges from 0.3 to 1.0
          // Formula: opacity = 0.3 + (percentage / 80) * 0.7
          opacity = 0.3 + (percentage / 80) * 0.7;
        }

        // Create unique gradient ID for each opacity level
        const gradientId = `gradient-primary-${Math.round(opacity * 100)}`;

        return {
          skill,
          percentage,
          displayPct: pct,
          fill: primaryColor,
          opacity,
          gradientId,
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

    if (chartData.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          No skills data available
        </div>
      );
    }

    const chartConfig = {
      percentage: {
        label: "Percentage",
      },
    };

    // Custom label component to show skill name at bottom of chart (below bars)
    const CustomInsideLabel = (props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      payload?: { skill?: string };
      value?: string;
    }) => {
      const { x, y, width, height, payload, value } = props;
      const skillName = payload?.skill || value || "";

      if (!x || !y || !width || !height || !skillName) {
        return null;
      }

      const centerX = x + width / 2;
      // Position skill name at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 60px, so bottom is at ~190px
      // Use a fixed Y position that's always at the bottom regardless of bar height
      const chartHeight = 250;
      const bottomMargin = 60;
      const skillY = chartHeight - bottomMargin + 15; // Fixed position at bottom

      return (
        <text
          x={centerX}
          y={skillY}
          fill="#374151"
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          className="dark:fill-gray-200"
        >
          {skillName}
        </text>
      );
    };

    // Custom label component to show percentage at bottom of chart (below bars)
    const CustomBottomLabel = (props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      value?: number;
    }) => {
      const { x, y, width, height, value } = props;
      const percentage = value || 0;

      if (!x || !y || !width || !height) {
        return null;
      }

      const centerX = x + width / 2;
      // Position percentage at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 60px, so bottom is at ~190px
      // Use a fixed Y position that's always at the bottom regardless of bar height
      const chartHeight = 250;
      const bottomMargin = 60;
      const percentY = chartHeight - bottomMargin + 35; // Fixed position below skill name

      return (
        <text
          x={centerX}
          y={percentY}
          fill="#374151"
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          className="dark:fill-gray-200"
        >
          {`${percentage.toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div className="w-full -mb-4">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            barCategoryGap="25%"
          >
            <defs>
              {chartData.map((entry) => {
                // Create darker shade for gradient bottom
                const darkerShade = "#0EA5E9"; // Slightly darker blue
                return (
                  <linearGradient
                    key={entry.gradientId}
                    id={entry.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={entry.fill}
                      stopOpacity={entry.opacity}
                    />
                    <stop
                      offset="100%"
                      stopColor={darkerShade}
                      stopOpacity={entry.opacity}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <XAxis dataKey="skill" hide={true} />
            <YAxis type="number" domain={[0, 100]} hide={true} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 backdrop-blur-sm">
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold text-base text-gray-900 dark:text-gray-100">
                          {data.skill}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: primaryColor,
                              opacity: data.opacity,
                            }}
                          />
                          <span
                            className="font-bold text-lg"
                            style={{
                              color: primaryColor,
                              opacity: data.opacity,
                            }}
                          >
                            {data.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="percentage"
              radius={[8, 8, 8, 8]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#${entry.gradientId})`}
                  style={{
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
              {/* Skill name at bottom inside bar */}
              <LabelList content={CustomInsideLabel} dataKey="skill" />
              {/* Percentage at bottom inside bar */}
              <LabelList content={CustomBottomLabel} dataKey="percentage" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    );
  };

  // Debug logging
  console.log(
    "🎨 SkillPathPage Render - Loading:",
    loading,
    "HasTestAnswers:",
    hasTestAnswers,
    "User:",
    user?.id
  );

  if (loading) {
    console.log("⏳ Rendering loading state");
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Analyzing your skills...</p>
            <p className="text-xs text-muted-foreground mt-2">
              Loading skill data...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show message if user hasn't completed the skill test
  if (!hasTestAnswers) {
    console.log("📝 Rendering 'no test answers' state");
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-bold mb-2">
                Complete Your Skill Assessment
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Take our skill assessment to get personalized job
                recommendations and a custom learning path tailored to your
                strengths.
              </p>
              <Button onClick={() => navigate("/skill-test")} size="lg">
                Take Skill Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  console.log("✅ Rendering main SkillPathPage content");
  console.log("📊 Data summary:", {
    topSkills: topSkills.length,
    jobPaths: jobPaths.length,
    courseRecommendations: courseRecommendations.length,
    missingSkills: missingSkills.length,
    techSkills: Object.keys(techSkills).length,
    softSkills: Object.keys(softSkills).length,
    finalRole,
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
        {/* Debug Info - Development Only */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="text-xs space-y-1">
                <p>
                  <strong>Loading:</strong> {loading ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Has Test Answers:</strong>{" "}
                  {hasTestAnswers ? "Yes" : "No"}
                </p>
                <p>
                  <strong>User ID:</strong> {user?.id || "Not logged in"}
                </p>
                <p>
                  <strong>Top Skills:</strong> {topSkills.length}
                </p>
                <p>
                  <strong>Job Paths:</strong> {jobPaths.length}
                </p>
                <p>
                  <strong>Final Role:</strong> {finalRole || "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your Personalized Skill Path
          </h1>
          <p className="text-muted-foreground">
            Based on your assessment, here's your roadmap to career success
          </p>
        </div>

        {/* Recommended Role and Skills Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommended Role */}
          {finalRole && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  Recommended Role
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pb-1">
                <div className="flex flex-col items-center justify-center py-4 gap-4">
                  <img
                    src="/lovable-uploads/Code-Learning--Streamline-New-York.png"
                    alt="Code Learning"
                    className="w-full h-auto max-w-[100px] object-contain"
                  />
                  <Badge className="text-lg px-6 py-3 bg-breneo-blue hover:bg-breneo-blue/90 text-white border-0">
                    {finalRole}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Skills */}
          {Object.keys(techSkills).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  Technical Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pb-1">
                {renderSkillsChart(techSkills, "Technical Skills")}
              </CardContent>
            </Card>
          )}

          {/* Soft Skills */}
          {Object.keys(softSkills).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  Soft Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pb-1">
                {renderSkillsChart(softSkills, "Soft Skills")}
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Job Paths
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Recommended Courses
            </TabsTrigger>
            <TabsTrigger
              value="missing-skills"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Missing Skills
            </TabsTrigger>
            <TabsTrigger value="next-steps" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next Steps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {jobPaths.length > 0 ? (
              jobPaths.map((job, index) => (
                <Card
                  key={job.title}
                  className={index === 0 ? "border-primary" : ""}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {job.title}
                          {index === 0 && (
                            <Badge variant="default">Best Match</Badge>
                          )}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1">
                          {job.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {job.matchPercentage}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Match
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Career Info</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Salary:</span>{" "}
                            {job.salaryRange}
                          </div>
                          <div>
                            <span className="font-medium">Time to Ready:</span>{" "}
                            {job.timeToReady}
                          </div>
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
                  <p className="text-muted-foreground">
                    Complete a skill assessment to see personalized job
                    recommendations.
                  </p>
                  <Button
                    onClick={() => navigate("/skill-test")}
                    className="mt-4"
                  >
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
                    <p className="text-sm text-muted-foreground">
                      by {course.provider}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{course.description}</p>
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary">{course.level}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {course.duration}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {course.relevantSkills.slice(0, 3).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs"
                        >
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

          <TabsContent value="missing-skills" className="space-y-4">
            {missingSkills.length > 0 ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Skills Gap Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your recommended job paths, here are skills you
                    should consider developing to improve your career prospects.
                    These skills are required by multiple job positions but are
                    currently missing from your profile.
                  </p>
                </div>

                {missingSkills.map((missingSkill) => (
                  <Card
                    key={missingSkill.skill}
                    className="border-l-4 border-l-orange-500"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <CardTitle className="text-lg">
                              {missingSkill.skill}
                            </CardTitle>
                            <Badge
                              variant={
                                missingSkill.category === "tech"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                missingSkill.category === "tech"
                                  ? "bg-blue-500"
                                  : ""
                              }
                            >
                              {missingSkill.category === "tech"
                                ? "Technical"
                                : "Soft Skill"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                missingSkill.importance === "high"
                                  ? "border-red-500 text-red-600"
                                  : missingSkill.importance === "medium"
                                  ? "border-orange-500 text-orange-600"
                                  : "border-gray-500 text-gray-600"
                              }
                            >
                              {missingSkill.importance === "high"
                                ? "High Priority"
                                : missingSkill.importance === "medium"
                                ? "Medium Priority"
                                : "Low Priority"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Required by {missingSkill.frequency} job
                              {missingSkill.frequency > 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Required by:
                            </span>
                            {missingSkill.requiredByJobs.map((job, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {job}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <XCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Why Important */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm mb-1 text-blue-900 dark:text-blue-100">
                              Why This Matters
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              This skill is required by {missingSkill.frequency}{" "}
                              of your recommended job path
                              {missingSkill.frequency > 1 ? "s" : ""}.
                              Developing this skill will significantly improve
                              your career prospects and job match percentage.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Courses */}
                      {missingSkill.recommendedCourses.length > 0 ? (
                        <div>
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Recommended Courses to Learn {missingSkill.skill}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {missingSkill.recommendedCourses
                              .slice(0, 4)
                              .map((course) => (
                                <Card
                                  key={course.id}
                                  className="border border-gray-200 dark:border-gray-700"
                                >
                                  <CardContent className="p-4">
                                    <h5 className="font-medium text-sm mb-1">
                                      {course.title}
                                    </h5>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      by {course.provider}
                                    </p>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {course.level}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {course.duration}
                                      </span>
                                    </div>
                                    {course.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                        {course.description}
                                      </p>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-xs"
                                      onClick={() =>
                                        navigate(`/course/${course.id}`)
                                      }
                                    >
                                      View Course
                                      <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-muted/50 p-4 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            No courses found for this skill yet. Check back
                            later or search for "{missingSkill.skill}" courses.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">Great Job!</h3>
                  <p className="text-muted-foreground">
                    You have all the key skills needed for your recommended
                    career paths. Keep building on your strengths!
                  </p>
                </CardContent>
              </Card>
            )}
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
                    <div
                      key={cert}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <h4 className="font-medium">{cert}</h4>
                        <p className="text-sm text-muted-foreground">
                          Industry-recognized certification for{" "}
                          {jobPaths[0]?.title}
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
                      <h4 className="font-medium">
                        Complete foundational courses
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Build your core skills (2-3 months)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Build portfolio projects</h4>
                      <p className="text-sm text-muted-foreground">
                        Demonstrate your skills (1-2 months)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Earn relevant certifications
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Validate your expertise (1-2 months)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Apply for positions</h4>
                      <p className="text-sm text-muted-foreground">
                        Start your career journey
                      </p>
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
