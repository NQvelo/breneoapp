import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DollarSign,
} from "lucide-react";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
  generateRecommendations,
} from "@/utils/skillTestUtils";
import { generateRoleSummary, generateRequiredSkills } from "@/utils/roleUtils";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/api/auth/apiClient";
import {
  calculateAISalary,
  formatSalaryRange,
} from "@/services/jobs/salaryService";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { jobService, ApiJob, JobFilters } from "@/api/jobs";
import { filterATSJobs } from "@/utils/jobFilterUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LabelList, Cell } from "recharts";

interface JobPath {
  title: string;
  description: string;
  matchPercentage: number;
  requiredSkills: string[];
  suggestedCourses: string[];
  certifications: string[];
  salaryRange: string;
  timeToReady: string;
  jobs?: ApiJob[]; // Actual job listings for this path
  summary?: string; // AI-generated role summary
  aiGeneratedSkills?: string[]; // AI-generated required skills
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

// Generate AI-powered explanation for recommended role
const generateRoleExplanation = (
  role: string,
  techSkills: Record<string, string>,
  softSkills: Record<string, string>,
  topSkills: Array<{ skill: string; score: number }>,
  jobPaths: JobPath[],
): string => {
  const topTechSkills = Object.entries(techSkills)
    .sort((a, b) => {
      const scoreA = parseFloat(String(a[1]).replace("%", "")) || 0;
      const scoreB = parseFloat(String(b[1]).replace("%", "")) || 0;
      return scoreB - scoreA;
    })
    .slice(0, 3)
    .map(([skill]) => skill);

  const topSoftSkills = Object.entries(softSkills)
    .sort((a, b) => {
      const scoreA = parseFloat(String(a[1]).replace("%", "")) || 0;
      const scoreB = parseFloat(String(b[1]).replace("%", "")) || 0;
      return scoreB - scoreA;
    })
    .slice(0, 2)
    .map(([skill]) => skill);

  const avgMatchPercentage =
    jobPaths.length > 0
      ? jobPaths.reduce((sum, path) => sum + path.matchPercentage, 0) /
        jobPaths.length
      : 75;

  // Build personalized explanation in simple, human-friendly language
  let explanation = `We think **${role}** is the perfect career path for you. `;

  // Why user deserves it - simple language
  explanation += `You're really good at `;
  if (topTechSkills.length > 0) {
    explanation += topTechSkills.join(", ");
    if (topSoftSkills.length > 0) {
      explanation += `, and you also have great ${topSoftSkills.join(
        " and ",
      )} skills`;
    }
  } else if (topSoftSkills.length > 0) {
    explanation += topSoftSkills.join(" and ");
  } else {
    explanation += "many important skills";
  }
  explanation += `. Your skills match really well with what ${role} jobs need - about ${Math.round(
    avgMatchPercentage,
  )}% match! `;

  // Why it's good - simple language
  explanation += `This role is great for you because it lets you use your best skills every day. `;
  explanation += `You'll get to learn new things and grow in your career. `;
  explanation += `Your mix of technical skills and people skills means you'll do really well in this job. `;
  explanation += `There are lots of opportunities for ${role.toLowerCase()}s, so you'll have a stable and exciting career path ahead.`;

  return explanation;
};

// Helper function to generate job path details based on category and skills
const getJobPathDetails = (
  category: string,
  skills: Array<{ skill: string; score: number }>,
): Omit<JobPath, "matchPercentage"> => {
  const skillNames = skills.map((s) => s.skill);
  const topSkills = skillNames.slice(0, 4);

  // Default job path structure
  const basePath: Omit<JobPath, "matchPercentage"> = {
    title: category,
    description: `Build your career using your skills in ${skillNames.join(
      ", ",
    )}.`,
    requiredSkills: topSkills,
    suggestedCourses: [
      `${category} Fundamentals`,
      "Advanced Techniques",
      "Industry Best Practices",
    ],
    certifications: [`${category} Professional Certificate`],
    salaryRange: "", // Will be populated dynamically
    timeToReady: "3-6 months",
  };

  // Customize based on category
  switch (category) {
    case "Software Development":
      return {
        ...basePath,
        title: "Software Engineer",
        description:
          "Build and maintain software applications using modern technologies and your programming skills.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : ["Programming", "Problem Solving", "Version Control", "Testing"],
        suggestedCourses: [
          "Full-Stack Development",
          "Data Structures & Algorithms",
          "System Design",
        ],
        certifications: ["AWS Cloud Practitioner", "Google Cloud Associate"],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "6-12 months",
      };

    case "UX/UI Design":
      return {
        ...basePath,
        title: "UX/UI Designer",
        description:
          "Create intuitive and beautiful user interfaces and experiences.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
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
        salaryRange: "", // Will be populated dynamically
        timeToReady: "4-8 months",
      };

    case "Data Analysis":
      return {
        ...basePath,
        title: "Data Analyst",
        description:
          "Transform data into actionable insights for business decisions.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : ["Data Analysis", "SQL", "Statistics", "Data Visualization"],
        suggestedCourses: [
          "Data Analysis with Python",
          "SQL for Data Science",
          "Business Intelligence",
        ],
        certifications: ["Microsoft Power BI", "Tableau Desktop Specialist"],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "3-6 months",
      };

    case "Product Management":
      return {
        ...basePath,
        title: "Product Manager",
        description:
          "Lead product development and coordinate cross-functional teams.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
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
        salaryRange: "", // Will be populated dynamically
        timeToReady: "4-8 months",
      };

    case "DevOps & Cloud":
      return {
        ...basePath,
        title: "DevOps Engineer",
        description:
          "Manage infrastructure, automate deployments, and ensure system reliability.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
                "Cloud Computing",
                "CI/CD",
                "Containerization",
                "Infrastructure as Code",
              ],
        suggestedCourses: [
          "Cloud Architecture",
          "DevOps Fundamentals",
          "Kubernetes & Docker",
        ],
        certifications: [
          "AWS Certified Solutions Architect",
          "Kubernetes Administrator",
        ],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "4-8 months",
      };

    case "Mobile Development":
      return {
        ...basePath,
        title: "Mobile Developer",
        description:
          "Build native and cross-platform mobile applications for iOS and Android.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
                "Mobile Development",
                "React Native",
                "iOS/Android",
                "App Design",
              ],
        suggestedCourses: [
          "Mobile App Development",
          "React Native Mastery",
          "Native Development",
        ],
        certifications: ["Google Mobile Web Specialist", "Apple Developer"],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "4-8 months",
      };

    case "Cybersecurity":
      return {
        ...basePath,
        title: "Cybersecurity Specialist",
        description:
          "Protect systems and data from cyber threats and vulnerabilities.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
                "Network Security",
                "Penetration Testing",
                "Encryption",
                "Security Analysis",
              ],
        suggestedCourses: [
          "Cybersecurity Fundamentals",
          "Ethical Hacking",
          "Security Architecture",
        ],
        certifications: ["CompTIA Security+", "CEH Certification"],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "6-12 months",
      };

    case "Quality Assurance":
      return {
        ...basePath,
        title: "QA Engineer",
        description:
          "Ensure software quality through comprehensive testing and automation.",
        requiredSkills:
          topSkills.length > 0
            ? topSkills
            : [
                "Test Automation",
                "Quality Assurance",
                "Bug Tracking",
                "Test Planning",
              ],
        suggestedCourses: [
          "QA Fundamentals",
          "Test Automation",
          "Performance Testing",
        ],
        certifications: ["ISTQB Certification", "Selenium Expert"],
        salaryRange: "", // Will be populated dynamically
        timeToReady: "3-6 months",
      };

    default:
      // For custom/generic categories, use the skill names as the title
      return {
        ...basePath,
        title: category,
        description: `Leverage your expertise in ${skillNames.join(
          ", ",
        )} to advance your career.`,
        requiredSkills: topSkills,
      };
  }
};

// Generate job paths based on hard skills from user test
// Uses exact skill names from the hard skills chart
const generateJobPaths = (
  skills: Array<{ skill: string; score: number }>,
): JobPath[] => {
  // Filter out soft skills - only use hard/tech skills for job path generation
  const softSkillKeywords = [
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "critical thinking",
    "time management",
    "adaptability",
    "creativity",
    "collaboration",
    "emotional intelligence",
    "work ethic",
    "interpersonal",
    "negotiation",
    "presentation",
    "public speaking",
    "active listening",
    "empathy",
    "patience",
    "flexibility",
    "stress management",
    "conflict resolution",
    "decision making",
    "organization",
    "planning",
    "multitasking",
  ];

  // Filter to only hard/tech skills
  const hardSkillsOnly = skills.filter((skill) => {
    const skillLower = skill.skill.toLowerCase().trim();
    return !softSkillKeywords.some(
      (keyword) => skillLower.includes(keyword) || keyword.includes(skillLower),
    );
  });

  // If no hard skills, return empty array (don't generate paths from soft skills)
  if (hardSkillsOnly.length === 0) {
    console.warn("No hard/tech skills found for job path generation");
    return [];
  }

  // Create job paths directly from hard skills - use exact skill names as titles
  // Sort by score (highest first) and limit to top 5
  const sortedHardSkills = hardSkillsOnly
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Convert each hard skill to a job path using its exact name
  const jobPaths: JobPath[] = sortedHardSkills.map((skillEntry) => {
    const skillName = skillEntry.skill;

    // Calculate match percentage based on skill score
    // Normalize score to percentage (assuming max score is around 5)
    const maxPossibleScore = 5;
    const matchPercentage = Math.min(
      95,
      Math.max(60, Math.round((skillEntry.score / maxPossibleScore) * 100)),
    );

    // Generate description and details based on the skill name
    const description = `Build your career using your ${skillName} skills. This path is tailored to your expertise in ${skillName}.`;

    // Use the skill name as the required skill (it's already in the user's skills)
    const requiredSkills = [skillName];

    // Generate generic courses and certifications that would help with this skill
    const suggestedCourses = [
      `Advanced ${skillName}`,
      `${skillName} Best Practices`,
      `${skillName} Professional Development`,
    ];

    const certifications = [
      `${skillName} Professional Certificate`,
      `${skillName} Specialist`,
    ];

    return {
      title: skillName, // Use exact skill name as job path title
      description,
      matchPercentage,
      requiredSkills,
      suggestedCourses,
      certifications,
      salaryRange: "", // Will be updated dynamically by fetchSalariesForJobPaths
      timeToReady: "3-6 months",
    };
  });

  return jobPaths;
};

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
  const [userCountry, setUserCountry] = useState<string>("Georgia");
  const [roleExplanation, setRoleExplanation] = useState<string>("");
  const [activeView, setActiveView] = useState<"skills" | "matchedRoles">(
    "skills",
  );
  const [userSkillsSet, setUserSkillsSet] = useState<Set<string>>(new Set());

  // Fetch user country from profile
  const fetchUserCountry = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      const profileData = response.data;
      // Check for country in various possible fields
      const country =
        (profileData as { country?: string })?.country ||
        (user as { country?: string })?.country ||
        "Georgia"; // Default to Georgia
      setUserCountry(country);
      return country;
    } catch (error) {
      console.error("Error fetching user country:", error);
      setUserCountry("Georgia"); // Default to Georgia on error
      return "Georgia";
    }
  }, [user]);

  // Calculate salary data for all job paths using AI (instant, no API calls)
  // Salary is calculated using AI algorithms in: src/services/jobs/salaryService.ts
  const calculateSalariesForJobPaths = useCallback(
    (paths: JobPath[], country: string): JobPath[] => {
      // Map job titles to search-friendly terms
      const jobTitleMap: Record<string, string> = {
        "Software Engineer": "software engineer",
        "UX/UI Designer": "ux designer",
        "Data Analyst": "data analyst",
        "Product Manager": "product manager",
      };

      // Calculate all salaries instantly using AI
      return paths.map((path) => {
        try {
          // Try mapped title first, then skill name directly
          const skillLower = path.title.toLowerCase().trim();
          let searchTitle = jobTitleMap[path.title] || skillLower;

          // Calculate salary using AI (instant, no API call)
          let salaryData = calculateAISalary(searchTitle, country);

          // If no salary data and searchTitle doesn't include "developer", try with "developer" suffix
          if (
            !salaryData.min_salary &&
            !salaryData.max_salary &&
            !searchTitle.includes("developer")
          ) {
            const developerTitle = `${searchTitle} developer`;
            salaryData = calculateAISalary(developerTitle, country);
            if (salaryData.min_salary || salaryData.max_salary) {
              searchTitle = developerTitle;
            }
          }

          // If still no salary data and searchTitle doesn't include "engineer", try as "engineer"
          if (
            !salaryData.min_salary &&
            !salaryData.max_salary &&
            !searchTitle.includes("engineer")
          ) {
            const engineerTitle = `${searchTitle} engineer`;
            salaryData = calculateAISalary(engineerTitle, country);
            if (salaryData.min_salary || salaryData.max_salary) {
              searchTitle = engineerTitle;
            }
          }

          // Check if we have valid salary data (both min and max should be positive numbers)
          if (
            salaryData &&
            (salaryData.min_salary || salaryData.max_salary) &&
            (salaryData.min_salary! > 0 || salaryData.max_salary! > 0)
          ) {
            const formattedSalary = formatSalaryRange(salaryData);
            // Double-check formatted salary is valid
            if (
              formattedSalary &&
              formattedSalary !== "Salary data not available"
            ) {
              return {
                ...path,
                salaryRange: formattedSalary,
              };
            }
          }

          // If we get here, try one more time with a generic developer title
          const genericTitle = skillLower.includes("design")
            ? "ui/ux designer"
            : skillLower.includes("data") || skillLower.includes("analyst")
              ? "data analyst"
              : skillLower.includes("manager")
                ? "product manager"
                : "software developer";

          const fallbackSalary = calculateAISalary(genericTitle, country);
          if (fallbackSalary.min_salary && fallbackSalary.max_salary) {
            const formattedSalary = formatSalaryRange(fallbackSalary);
            return {
              ...path,
              salaryRange: formattedSalary,
            };
          }

          // Last resort fallback
          console.warn(
            `Could not calculate salary for "${path.title}" (${searchTitle})`,
          );
          return {
            ...path,
            salaryRange: "Salary data not available",
          };
        } catch (error) {
          console.error(`Error calculating salary for ${path.title}:`, error);
          return {
            ...path,
            salaryRange: "Salary data not available",
          };
        }
      });
    },
    [],
  );

  // Fetch jobs for each job path based on tech skills (not job titles)
  // Jobs are fetched using the exact tech skills from the user's skill test
  const fetchJobsForJobPaths = useCallback(
    async (
      paths: JobPath[],
      techSkillsList: string[],
      country: string,
    ): Promise<JobPath[]> => {
      const updatedPaths = await Promise.all(
        paths.map(async (path) => {
          try {
            // Use tech skills directly as the search query instead of job titles
            // This ensures jobs match exactly with the user's tech skills
            const searchQuery =
              techSkillsList.length > 0
                ? techSkillsList.join(" ") // Combine all tech skills into search query
                : path.title.toLowerCase(); // Fallback to job title if no tech skills

            // Build filters with tech skills
            const filters: JobFilters = {
              country: country,
              countries: [],
              jobTypes: [],
              isRemote: false,
              datePosted: undefined,
              skills: techSkillsList, // Use tech skills for filtering
              salaryMin: undefined,
              salaryMax: undefined,
              salaryByAgreement: false,
            };

            // Fetch jobs for this job path using tech skills
            const jobsResponse = await jobService.fetchActiveJobs({
              query: searchQuery,
              filters: filters,
              page: 1,
              pageSize: 5, // Limit to 5 jobs per path
            });

            // Filter to only allowed ATS platforms
            const allowedATSJobs = filterATSJobs(jobsResponse.jobs);

            return {
              ...path,
              jobs: allowedATSJobs.slice(0, 5), // Limit to 5 jobs
            };
          } catch (error) {
            console.error(`Error fetching jobs for ${path.title}:`, error);
            return {
              ...path,
              jobs: [], // Return empty array on error
            };
          }
        }),
      );

      return updatedPaths;
    },
    [],
  );

  const loadSkillData = useCallback(async () => {
    try {
      // console.log("🚀 Starting loadSkillData");
      setLoading(true);

      // Method 1: Try Django backend skill test results API (same as ProfilePage)
      try {
        // console.log("📡 Attempting Django API call...");
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user!.id}`,
        );
        // console.log("🔍 SkillPathPage - Checking Django API:", response.data);

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
          // console.log("✅ Found skill test results from Django API");
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
            }),
          );
          const softSkillsArray = Object.entries(skillsJson.soft || {}).map(
            ([skill, pct]) => ({
              skill,
              score: parseFloat(String(pct).replace("%", "")) || 0,
            }),
          );

          // Prioritize hard/tech skills over soft skills
          // Sort tech skills first, then soft skills, then combine
          const sortedTechSkills = techSkillsArray.sort(
            (a, b) => b.score - a.score,
          );
          const sortedSoftSkills = softSkillsArray.sort(
            (a, b) => b.score - a.score,
          );

          // Use tech skills primarily, only add soft skills if we need more for display
          const allSkills = [...sortedTechSkills, ...sortedSoftSkills];
          const top = allSkills.slice(0, 5);
          setTopSkills(top);

          // Generate job paths based on hard/tech skills only (generateJobPaths filters soft skills internally)
          const paths = generateJobPaths(sortedTechSkills);

          // Get tech skills for job filtering (use tech skills only, not soft skills)
          const techSkillsList = Object.keys(skillsJson.tech || {});

          // Fetch user country first, then calculate salaries synchronously
          const country = await fetchUserCountry();
          const pathsWithSalaries = calculateSalariesForJobPaths(
            paths,
            country,
          );

          // Store user skills for comparison
          const allUserSkills = [...techSkillsArray, ...softSkillsArray].map(
            (s) => s.skill.toLowerCase(),
          );
          setUserSkillsSet(new Set(allUserSkills));

          // Initialize paths without summaries - they'll be generated immediately
          // Don't set placeholders to avoid showing short text
          setJobPaths(pathsWithSalaries);

          // Generate AI explanation for recommended role
          if (skillTestData.final_role) {
            const explanation = generateRoleExplanation(
              skillTestData.final_role,
              skillsJson.tech || {},
              skillsJson.soft || {},
              top,
              pathsWithSalaries,
            );
            setRoleExplanation(explanation);
          }

          setLoading(false);

          // Generate summaries and AI skills for each job path in background
          Promise.all(
            pathsWithSalaries.map(async (path) => {
              try {
                // Get user's top skills for personalized summary
                const userTopSkills = top.map((s) => s.skill);
                const [summary, aiSkills] = await Promise.all([
                  generateRoleSummary(
                    path.title,
                    userTopSkills,
                    path.matchPercentage,
                  ),
                  generateRequiredSkills(path.title),
                ]);
                // Ensure we always have an expanded summary (function should never return empty)
                const finalSummary =
                  summary && summary.length > 100
                    ? summary
                    : `**${
                        path.title
                      }** is an exciting and rewarding career path that offers tremendous opportunities for professional growth and personal fulfillment. This role allows you to work on meaningful projects that make a real impact, using your skills and creativity every day. As a ${path.title.toLowerCase()}, you'll have the chance to collaborate with talented teams, solve interesting challenges, and continuously learn new technologies and methodologies. The field is growing rapidly, with strong demand for skilled professionals, ensuring excellent job security and career advancement opportunities.`;

                return {
                  ...path,
                  summary: finalSummary,
                  aiGeneratedSkills:
                    aiSkills.length > 0 ? aiSkills : path.requiredSkills,
                };
              } catch (error) {
                console.error(
                  `Error generating data for ${path.title}:`,
                  error,
                );
                // Use expanded fallback, not short placeholder
                return {
                  ...path,
                  summary: `**${
                    path.title
                  }** is an exciting and rewarding career path that offers tremendous opportunities for professional growth and personal fulfillment. This role allows you to work on meaningful projects that make a real impact, using your skills and creativity every day. As a ${path.title.toLowerCase()}, you'll have the chance to collaborate with talented teams, solve interesting challenges, and continuously learn new technologies and methodologies. The field is growing rapidly, with strong demand for skilled professionals, ensuring excellent job security and career advancement opportunities.`,
                  aiGeneratedSkills: path.requiredSkills,
                };
              }
            }),
          ).then((updatedPaths) => {
            // Use functional update to ensure we're updating the correct state
            setJobPaths((prevPaths) => {
              // Create a map of updated paths by title for quick lookup
              const updatedMap = new Map(
                updatedPaths.map((path) => [path.title, path]),
              );
              // Merge updates with existing paths, preserving any other state
              return prevPaths.map((prevPath) => {
                const updated = updatedMap.get(prevPath.title);
                return updated || prevPath;
              });
            });
          });

          // Parallelize all heavy operations (jobs, missing skills, courses)
          Promise.all([
            // Update jobs in background
            (async () => {
              const pathsWithJobs = await fetchJobsForJobPaths(
                pathsWithSalaries,
                techSkillsList,
                country,
              );

              setJobPaths(pathsWithJobs);

              // Identify missing skills after jobs are loaded
              const missing = await identifyMissingSkills(
                Object.keys(skillsJson.tech || {}),
                Object.keys(skillsJson.soft || {}),
                pathsWithJobs,
              );
              setMissingSkills(missing);
            })(),
            // Get course recommendations in parallel
            (async () => {
              const courses = await getCourseRecommendations(techSkillsList);
              setCourseRecommendations(courses);
            })(),
          ]).catch((error) => {
            console.error("Error in background operations:", error);
          });

          return;
        }
      } catch (apiError) {
        // console.log("Django API not available, trying Supabase...");
      }

      // Method 2: Fallback to Supabase: fetch from usertestanswers
      const answers = await getUserTestAnswers(user!.id);
      // console.log("🔍 SkillPathPage - Checking Supabase test answers:", {
      //   userId: user!.id,
      //   answersCount: answers?.length || 0,
      //   hasAnswers: answers && answers.length > 0,
      // });

      if (!answers || answers.length === 0) {
        // console.log("❌ No test answers found for user");
        setHasTestAnswers(false);
        setLoading(false);
        return;
      }

      // console.log("✅ Test answers found, loading skill path data");
      setHasTestAnswers(true);

      // Calculate skill scores
      const scores = calculateSkillScores(answers);
      setSkillScores(scores);

      // Filter out soft skills - only use hard/tech skills for job matching
      // Common soft skills to exclude
      const softSkillKeywords = [
        "communication",
        "teamwork",
        "leadership",
        "problem solving",
        "critical thinking",
        "time management",
        "adaptability",
        "creativity",
        "collaboration",
        "emotional intelligence",
        "work ethic",
        "interpersonal",
        "negotiation",
        "presentation",
        "public speaking",
        "active listening",
        "empathy",
        "patience",
        "flexibility",
        "stress management",
        "conflict resolution",
        "decision making",
        "organization",
        "planning",
        "multitasking",
      ];

      // Separate hard skills (tech) from soft skills
      const hardSkills: Array<{ skill: string; score: number }> = [];
      const softSkillsOnly: Array<{ skill: string; score: number }> = [];

      Object.entries(scores).forEach(([skill, score]) => {
        const skillLower = skill.toLowerCase().trim();
        const isSoftSkill = softSkillKeywords.some(
          (keyword) =>
            skillLower.includes(keyword) || keyword.includes(skillLower),
        );

        if (isSoftSkill) {
          softSkillsOnly.push({ skill, score: score as number });
        } else {
          // Treat as hard/tech skill
          hardSkills.push({ skill, score: score as number });
        }
      });

      // Prioritize hard skills - sort by score
      const sortedHardSkills = hardSkills.sort((a, b) => b.score - a.score);
      const sortedSoftSkills = softSkillsOnly.sort((a, b) => b.score - a.score);

      // Use hard skills primarily, only add soft skills if we need more for display
      const allSkillsForDisplay = [
        ...sortedHardSkills,
        ...sortedSoftSkills,
      ].slice(0, 5);
      setTopSkills(allSkillsForDisplay);

      // Generate job paths based on hard skills only
      const paths = generateJobPaths(sortedHardSkills);

      // Get hard/tech skills for job filtering (exclude soft skills)
      const hardSkillsList = sortedHardSkills.map((s) => s.skill);

      // Fetch user country first, then calculate salaries synchronously
      const country = await fetchUserCountry();
      const pathsWithSalaries = calculateSalariesForJobPaths(paths, country);

      // Store user skills for comparison
      const allUserSkills = [...sortedHardSkills, ...sortedSoftSkills].map(
        (s) => s.skill.toLowerCase(),
      );
      setUserSkillsSet(new Set(allUserSkills));

      // Initialize paths without summaries - they'll be generated immediately
      // Don't set placeholders to avoid showing short text
      setJobPaths(pathsWithSalaries);

      // Generate AI explanation if we have a role from job paths
      if (pathsWithSalaries.length > 0) {
        const primaryRole = pathsWithSalaries[0].title;
        const techSkillsMap: Record<string, string> = {};
        const softSkillsMap: Record<string, string> = {};

        sortedHardSkills.forEach((s) => {
          techSkillsMap[s.skill] = `${s.score}%`;
        });
        sortedSoftSkills.forEach((s) => {
          softSkillsMap[s.skill] = `${s.score}%`;
        });

        const explanation = generateRoleExplanation(
          primaryRole,
          techSkillsMap,
          softSkillsMap,
          allSkillsForDisplay,
          pathsWithSalaries,
        );
        setRoleExplanation(explanation);
        setFinalRole(primaryRole);
      }

      setLoading(false);

      // Generate summaries and AI skills for each job path in background
      Promise.all(
        pathsWithSalaries.map(async (path) => {
          try {
            // Get user's top skills for personalized summary
            const userTopSkills = allSkillsForDisplay.map((s) => s.skill);
            const [summary, aiSkills] = await Promise.all([
              generateRoleSummary(
                path.title,
                userTopSkills,
                path.matchPercentage,
              ),
              generateRequiredSkills(path.title),
            ]);
            // Ensure we always have an expanded summary (function should never return empty)
            const finalSummary =
              summary && summary.length > 100
                ? summary
                : `**${
                    path.title
                  }** is an exciting and rewarding career path that offers tremendous opportunities for professional growth and personal fulfillment. This role allows you to work on meaningful projects that make a real impact, using your skills and creativity every day. As a ${path.title.toLowerCase()}, you'll have the chance to collaborate with talented teams, solve interesting challenges, and continuously learn new technologies and methodologies. The field is growing rapidly, with strong demand for skilled professionals, ensuring excellent job security and career advancement opportunities.`;

            return {
              ...path,
              summary: finalSummary,
              aiGeneratedSkills:
                aiSkills.length > 0 ? aiSkills : path.requiredSkills,
            };
          } catch (error) {
            console.error(`Error generating data for ${path.title}:`, error);
            // Use expanded fallback, not short placeholder
            return {
              ...path,
              summary: `**${
                path.title
              }** is an exciting and rewarding career path that offers tremendous opportunities for professional growth and personal fulfillment. This role allows you to work on meaningful projects that make a real impact, using your skills and creativity every day. As a ${path.title.toLowerCase()}, you'll have the chance to collaborate with talented teams, solve interesting challenges, and continuously learn new technologies and methodologies. The field is growing rapidly, with strong demand for skilled professionals, ensuring excellent job security and career advancement opportunities.`,
              aiGeneratedSkills: path.requiredSkills,
            };
          }
        }),
      ).then((updatedPaths) => {
        // Use functional update to ensure we're updating the correct state
        setJobPaths((prevPaths) => {
          // Create a map of updated paths by title for quick lookup
          const updatedMap = new Map(
            updatedPaths.map((path) => [path.title, path]),
          );
          // Merge updates with existing paths, preserving any other state
          return prevPaths.map((prevPath) => {
            const updated = updatedMap.get(prevPath.title);
            return updated || prevPath;
          });
        });
      });

      // Parallelize all heavy operations (jobs, missing skills, courses)
      Promise.all([
        // Update jobs in background
        (async () => {
          const pathsWithJobs = await fetchJobsForJobPaths(
            pathsWithSalaries,
            hardSkillsList,
            country,
          );

          setJobPaths(pathsWithJobs);

          // Identify missing skills after jobs are loaded
          const missing = await identifyMissingSkills(
            hardSkillsList,
            [],
            pathsWithJobs,
          );
          setMissingSkills(missing);
        })(),
        // Get course recommendations in parallel
        (async () => {
          const courses = await getCourseRecommendations(hardSkillsList);
          setCourseRecommendations(courses);
        })(),
      ]).catch((error) => {
        console.error("Error in background operations:", error);
      });
    } catch (error) {
      console.error("❌ Error loading skill data:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : String(error),
      );
      setHasTestAnswers(false);
    } finally {
      // Ensure loading is always set to false
      console.log("🏁 loadSkillData finished - setting loading to false");
      setLoading(false);
    }
  }, [
    user,
    fetchUserCountry,
    calculateSalariesForJobPaths,
    fetchJobsForJobPaths,
  ]);

  useEffect(() => {
    // console.log("🔍 SkillPathPage useEffect - User:", user?.id);
    if (!user) {
      // console.log("❌ No user, redirecting to login");
      navigate("/auth/login");
      return;
    }
    // console.log("✅ User found, loading skill data");
    loadSkillData();
    fetchUserCountry();
  }, [user, navigate, loadSkillData, fetchUserCountry]);

  const getCourseRecommendations = async (
    skills: string[],
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
    jobPaths: JobPath[],
  ): Promise<MissingSkill[]> => {
    // Normalize user skills to lowercase for comparison
    const allUserSkills = [...userTechSkills, ...userSoftSkills].map((s) =>
      s.toLowerCase().trim(),
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
          s.toLowerCase().trim(),
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
      skillFrequency.entries(),
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
        // If >= 40%, use full opacity (1.0) to make results more visible
        // Otherwise, scale opacity from 0.3 to 1.0 based on percentage
        let opacity: number;
        if (percentage >= 40) {
          opacity = 1.0; // Full opacity for bars 40% and higher
        } else {
          // Scale from 0% to 40%: opacity ranges from 0.3 to 1.0
          // Formula: opacity = 0.3 + (percentage / 40) * 0.7
          opacity = 0.3 + (percentage / 40) * 0.7;
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
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Use a fixed Y position that's always at the bottom regardless of bar height
      // Added more space between bars and skill names
      const chartHeight = 250;
      const bottomMargin = 80;
      const skillY = chartHeight - bottomMargin + 25; // Fixed position at bottom with more space

      // Split long skill names into multiple lines
      // Max characters per line based on bar width (approximately 8-10 chars per 50px width)
      const maxCharsPerLine = Math.max(8, Math.floor(width / 6));
      const words = skillName.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      // Try to split by words first, then by characters if needed
      for (const word of words) {
        if (word.length > maxCharsPerLine) {
          // If a single word is too long, split it by characters
          if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
          }
          // Split the long word into chunks
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            lines.push(word.slice(i, i + maxCharsPerLine));
          }
        } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
          currentLine = currentLine ? currentLine + " " + word : word;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      // If still too long, split by characters
      if (
        lines.length === 0 ||
        (lines.length === 1 && lines[0].length > maxCharsPerLine * 1.5)
      ) {
        lines.length = 0;
        for (let i = 0; i < skillName.length; i += maxCharsPerLine) {
          lines.push(skillName.slice(i, i + maxCharsPerLine));
        }
      }

      // Limit to 2 lines max
      const displayLines = lines.slice(0, 2);
      const lineHeight = 14;
      const startY = skillY - (displayLines.length - 1) * (lineHeight / 2);

      return (
        <text
          x={centerX}
          y={startY}
          fill="#374151"
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          className="dark:fill-gray-200"
        >
          {displayLines.map((line, index) => (
            <tspan key={index} x={centerX} dy={index === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
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
      payload?: { skill?: string };
    }) => {
      const { x, y, width, height, value, payload } = props;
      const percentage = value || 0;
      const skillName = payload?.skill || "";

      if (!x || !y || !width || !height) {
        return null;
      }

      const centerX = x + width / 2;
      // Position percentage at fixed bottom position of chart
      // Chart height is 250px, bottom margin is 80px, so bottom is at ~170px
      // Adjust position based on whether skill name is wrapped to 2 lines
      // Added more space between skill name and percentage
      const chartHeight = 250;
      const bottomMargin = 80;
      const maxCharsPerLine = Math.max(8, Math.floor(width / 6));
      const isLongName = skillName.length > maxCharsPerLine * 1.2;
      // If skill name is wrapped, move percentage down a bit more
      const percentY = chartHeight - bottomMargin + (isLongName ? 70 : 60);

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
            margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
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
                    <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 backdrop-blur-sm">
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
    user?.id,
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
      {/* Skills/Matched Roles Switcher */}
      <div className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 md:static md:translate-x-0 md:left-auto md:flex md:justify-center md:mb-6 md:w-auto">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 40, mass: 1 }}
          className="relative inline-flex items-center bg-gray-100/80 dark:bg-[#242424]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-1 shadow-sm"
        >
          <motion.button
            layout
            onClick={() => setActiveView("skills")}
            className={`relative px-6 py-2.5 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 whitespace-nowrap outline-none ${
              activeView === "skills"
                ? "text-gray-900 dark:text-gray-100 font-bold"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {activeView === "skills" && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-l-3xl rounded-r-3xl"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 1,
                }}
              />
            )}
            <span className="relative z-10">Your Skills</span>
          </motion.button>

          <motion.button
            layout
            onClick={() => setActiveView("matchedRoles")}
            className={`relative px-6 py-2.5 rounded-l-3xl rounded-r-3xl text-sm transition-colors duration-200 whitespace-nowrap outline-none ${
              activeView === "matchedRoles"
                ? "text-gray-900 dark:text-gray-100 font-bold"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {activeView === "matchedRoles" && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-l-3xl rounded-r-3xl"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 1,
                }}
              />
            )}
            <span className="relative z-10">Matched Roles</span>
          </motion.button>
        </motion.div>
      </div>

      <div className="space-y-4 md:space-y-6 pb-32 md:pb-6">
        {/* Skills Chart Section - shown when "Your Skills" is active */}
        {activeView === "skills" && (
          <>
            {/* AI-Generated Role Explanation */}
            {finalRole && roleExplanation && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img
                      src="/lovable-uploads/3dicons-trophy-iso-color.png"
                      alt="Trophy"
                      className="h-12 w-12 flex-shrink-0"
                    />
                    <CardTitle className="text-xl">
                      You Are {finalRole}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {roleExplanation.split("**").map((part, index) =>
                        index % 2 === 1 ? (
                          <strong
                            key={index}
                            className="text-primary font-semibold"
                          >
                            {part}
                          </strong>
                        ) : (
                          part
                        ),
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Charts */}
            {(Object.keys(techSkills).length > 0 ||
              Object.keys(softSkills).length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Technical Skills Chart */}
                {Object.keys(techSkills).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Technical Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderSkillsChart(techSkills, "Technical Skills")}
                    </CardContent>
                  </Card>
                )}

                {/* Soft Skills Chart */}
                {Object.keys(softSkills).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Soft Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {renderSkillsChart(softSkills, "Soft Skills")}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* Matched Roles Section - shown when "Matched Roles" is active */}
        {activeView === "matchedRoles" && (
          <div className="space-y-4">
            {jobPaths.length > 0 ? (
              jobPaths.map((job, index) => (
                <Card
                  key={job.title}
                  className={index === 0 ? "bg-primary/5" : ""}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl flex-1">
                          {job.title}
                        </CardTitle>
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate(
                              `/skill-path/${encodeURIComponent(job.title)}`,
                              { state: { jobPath: job } },
                            );
                          }}
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>

                      {/* Salary and Brief Cards - Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Salary Information Card */}
                        <Card className="bg-gray-50 dark:bg-gray-800/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-primary" />
                              Salary Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                              <div className="text-lg font-bold text-primary mb-2">
                                {job.salaryRange || "Salary data not available"}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Average salary range based on current market
                                data
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Role Brief Card */}
                        <Card className="bg-gray-50 dark:bg-gray-800/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              Role Brief
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                              <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                {job.summary ? (
                                  job.summary.split("**").map((part, index) =>
                                    index % 2 === 1 ? (
                                      <strong
                                        key={index}
                                        className="text-primary font-semibold"
                                      >
                                        {part}
                                      </strong>
                                    ) : (
                                      part
                                    ),
                                  )
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Generating role brief...
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(job.aiGeneratedSkills || job.requiredSkills).map(
                            (skill, index) => {
                              const hasSkill = userSkillsSet.has(
                                skill.toLowerCase(),
                              );
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] transition-colors ${
                                    hasSkill
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <div className="flex-shrink-0">
                                    {hasSkill ? (
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium whitespace-nowrap">
                                    {skill}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SkillPathPage;
