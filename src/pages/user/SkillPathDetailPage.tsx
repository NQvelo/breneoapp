import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  TrendingUp,
  BookOpen,
  Code,
  Briefcase,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { jobService, ApiJob, JobFilters } from "@/api/jobs";
import { filterATSJobs } from "@/utils/jobFilterUtils";
import { profileApi } from "@/api/profile";
import { normalizeSkillName } from "@/services/matching";
import {
  calculateAISalary,
  formatSalaryRange,
} from "@/services/jobs/salaryService";
import {
  getCompleteMarketData,
  generateAIMarketInsights,
} from "@/services/jobs/marketDataService";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Course {
  id: string;
  title: string;
  provider: string;
  level: string;
  duration: string;
  description: string;
  required_skills: string[];
  image?: string;
}

interface JobPath {
  title: string;
  description: string;
  matchPercentage: number;
  requiredSkills: string[];
  suggestedCourses: string[];
  certifications: string[];
  salaryRange: string;
  timeToReady: string;
  aiGeneratedSkills?: string[]; // AI-generated required skills
}

// New Interface matching the user's provided JSON
export interface SalaryInfo {
  max: number;
  min: number;
  display: string;
  currency: string;
}

export interface ProfessionDetails {
  id: number;
  title: string;
  description: string;
  skills: string[];
  salary_info: Record<string, SalaryInfo>;
  market_popularity: { year: string; value: number }[];
  relevant_courses: string[];
  created_at: string;
  updated_at: string;
}

export interface MatchedProfession {
  id: number;
  profession: ProfessionDetails;
  match_score: number;
  created_at: string;
}

const SkillPathDetailPage = () => {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roleInfo, setRoleInfo] = useState<string>("");
  const [salaryInfo, setSalaryInfo] = useState<string>("");
  const [popularityData, setPopularityData] = useState<string>("");
  const [popularityChartData, setPopularityChartData] = useState<
    Array<{ year: string; popularity: number }>
  >([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projectIdeas, setProjectIdeas] = useState<string[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [userCountry, setUserCountry] = useState<string>("Georgia");
  const [activeCountry, setActiveCountry] = useState<string>("US");
  const [salaryCurrency, setSalaryCurrency] = useState<string>("$");
  const [pageTitle, setPageTitle] = useState<string>("");
  const [userSkillSet, setUserSkillSet] = useState<Set<string>>(new Set());
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const decodedSkillName = skillName ? decodeURIComponent(skillName) : "";
  const jobPath = location.state?.jobPath as JobPath | undefined;
  const matchedProfession = location.state?.profession as MatchedProfession | undefined;

  // Initialize title from state or URL, but prefer waiting for data if URL is ID
  useEffect(() => {
     if (location.state?.profession?.profession?.title) {
         setPageTitle(location.state.profession.profession.title);
     } else if (decodedSkillName && isNaN(Number(decodedSkillName))) {
         setPageTitle(decodedSkillName);
     }
  }, [location.state, decodedSkillName]);

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    const loadUserSkills = async () => {
      try {
        const userId = (user as { id?: string | number })?.id;
        if (!userId) return;

        const [profileSkillsResult, skillTestResult] = await Promise.allSettled([
          profileApi.getMySkills(),
          apiClient.get(`/api/skilltest/results/?user=${userId}`),
        ]);

        const profileSkills =
          profileSkillsResult.status === "fulfilled"
            ? profileSkillsResult.value
            : [];

        const fromProfile = profileSkills
          .map((s) => normalizeSkillName(String(s.skill_name || "")))
          .filter(Boolean);

        let fromSkillTest: string[] = [];
        if (skillTestResult.status === "fulfilled") {
          const responseData = skillTestResult.value.data;
          let skillTestData: Record<string, unknown> | null = null;

          if (Array.isArray(responseData) && responseData.length > 0) {
            skillTestData = responseData[0] as Record<string, unknown>;
          } else if (responseData && typeof responseData === "object") {
            skillTestData = responseData as Record<string, unknown>;
          }

          if (skillTestData?.skills_json && typeof skillTestData.skills_json === "object") {
            const skillsJson = skillTestData.skills_json as {
              tech?: Record<string, unknown>;
              soft?: Record<string, unknown>;
            };
            const techSkills = Object.keys(skillsJson.tech || {});
            const softSkills = Object.keys(skillsJson.soft || {});
            fromSkillTest = [...techSkills, ...softSkills].map(normalizeSkillName);
          }
        }

        const normalizedSet = new Set(
          [...fromProfile, ...fromSkillTest].map(normalizeSkillName).filter(Boolean),
        );

        if (!isCancelled) {
          setUserSkillSet(normalizedSet);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };

    loadUserSkills();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth/login");
      return;
    }

    if (!decodedSkillName) {
      navigate("/skill-path");
      return;
    }

    const loadDataAsync = async () => {
      try {
        setLoading(true);
        
        // Check if we have passed profession data
        const matchedProfessionWrapper = location.state?.profession as MatchedProfession | undefined;
        let professionDetails = matchedProfessionWrapper?.profession;
        let matchedProfession = matchedProfessionWrapper;

        // Fallback: If no state, try to find profession by ID from the API list
        // This handles direct links like /skill-path/81
        if (!professionDetails && decodedSkillName && !isNaN(Number(decodedSkillName))) {
             try {
                 const id = Number(decodedSkillName);
                 const response = await apiClient.get<MatchedProfession[]>(API_ENDPOINTS.ME.MATCHED_PROFESSIONS);
                 if (Array.isArray(response.data)) {
                     const found = response.data.find(p => p.profession.id === id);
                     if (found) {
                         matchedProfession = found;
                         professionDetails = found.profession;
                     }
                 }
             } catch (err) {
                 console.error("Error fetching profession by ID:", err);
             }
        }

        // Usage of matched profession data if available
        let searchTerm = decodedSkillName;

        if (professionDetails) {
            setRoleInfo(professionDetails.description);
            setPageTitle(professionDetails.title); // Update title from loaded details
            searchTerm = professionDetails.title; // Use the actual title for searching
            
            // Initial Salary Set - Try to find based on user country or default to US
            const salaryInfoMap = professionDetails.salary_info || {};
            const availableCountries = Object.keys(salaryInfoMap);
            
            // Default to US or first available
            let initialCountry = "US";
            if (!salaryInfoMap["US"]) {
                initialCountry = availableCountries[0] || "US";
            }
            
            setActiveCountry(initialCountry);
            const defaultSalary = salaryInfoMap[initialCountry];

            if (defaultSalary) {
                setSalaryInfo(defaultSalary.display);
                setSalaryCurrency(defaultSalary.currency);
            } else {
                 loadSalaryInfo("Georgia");
            }
            
            // Market data from profession
            if (professionDetails.market_popularity && professionDetails.market_popularity.length > 0) {
                 const popularity = professionDetails.market_popularity;
                 const lastValue = popularity[popularity.length - 1]?.value || 0;
                 const trend = lastValue > 80 ? "High" : "Medium";
                 
                 setPopularityData(
                    `Market Demand: ${trend}. Based on recent data.`
                 );
                 
                 // Map to chart format
                 const chartData = popularity.map(p => ({
                    year: p.year,
                    popularity: p.value
                 }));
                 setPopularityChartData(chartData);
            } else {
                 const defaultStats = `${searchTerm} professionals are in high demand. Loading real-time market data...`;
                 setPopularityData(defaultStats);
            }
            
            // Project ideas could be dynamic if API provided them, but for now generate
            generateProjectIdeas(searchTerm); 
            
            // Courses from API logic could go here
            
        } else {
            // Load synchronous data immediately (instant display)
            loadRoleInfo();
            // Set default popularity data for instant display
            const defaultStats = `${decodedSkillName} professionals are in high demand. Loading real-time market data...`;
            setPopularityData(defaultStats);
            
             // Calculate salary immediately with default country (instant, no API call)
            loadSalaryInfo("Georgia"); // Use default, will update if country differs
            
            generateProjectIdeas(searchTerm);
        }
    

        if (!professionDetails) {
            const currentYear = new Date().getFullYear();
            const defaultTrend = [50, 55, 60, 65, 70];
            const defaultChartData = defaultTrend.map((value, index) => ({
              year: String(currentYear - 4 + index),
              popularity: value,
            }));
            setPopularityChartData(defaultChartData);
        }

        // Show content immediately with initial data
        setLoading(false);

        // Fetch country and update salary in background (non-blocking)
        const country = await fetchUserCountry();
        
        // Only update salary logic if we are NOT using the API data
        // OR if we want to auto-switch the currency to the user's country if available in API data
        // Only update salary logic if we are NOT using the API data
        // OR if we want to auto-switch the currency to the user's country if available in API data
        if (professionDetails) {
             // Try to switch to user's country currency if available in API
             const salaryInfoMap = professionDetails.salary_info || {};
             if (salaryInfoMap[country]) {
                 setActiveCountry(country);
                 setSalaryInfo(salaryInfoMap[country].display);
             }
        } else if (country !== "Georgia") {
          loadSalaryInfo(country); // Update salary if country differs
        }

        // Parallelize all async operations (non-blocking)
        Promise.all([
          !professionDetails ? loadPopularityData(country) : Promise.resolve(), // Load real market data only if not provided
          loadCourses(searchTerm),
          loadJobs(country, searchTerm),
        ]).catch((error) => {
          console.error("Error in background operations:", error);
        });
      } catch (error) {
        console.error("Error loading skill path details:", error);
        setLoading(false);
      }
    };

    loadDataAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedSkillName, user, matchedProfession]);

  const fetchUserCountry = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      const profileData = response.data;
      const country =
        (profileData as { country?: string })?.country ||
        (user as { country?: string })?.country ||
        "Georgia";
      setUserCountry(country);
      return country;
    } catch (error) {
      console.error("Error fetching user country:", error);
      return "Georgia";
    }
  };

  const loadRoleInfo = () => {
    // Generate role information based on skill name (synchronous - instant)
    const roleDescriptions: Record<string, string> = {
      JavaScript:
        "JavaScript developers are responsible for building interactive web applications and dynamic user interfaces. They work with modern frameworks like React, Vue, and Angular to create responsive and engaging web experiences.",
      Python:
        "Python developers specialize in backend development, data science, and automation. They build scalable server applications, analyze data, and create machine learning models using Python's extensive library ecosystem.",
      React:
        "React developers focus on building user interfaces using the React library. They create reusable components, manage application state, and implement modern UI patterns for web and mobile applications.",
      "UI/UX Design":
        "UI/UX designers create intuitive and visually appealing user interfaces. They conduct user research, design wireframes and prototypes, and ensure optimal user experiences across different platforms.",
      "Data Analysis":
        "Data analysts transform raw data into actionable insights. They use statistical methods, visualization tools, and programming languages to help organizations make data-driven decisions.",
    };

    const defaultDescription = `${decodedSkillName} professionals are in high demand across various industries. This role involves working with ${decodedSkillName} technologies to solve complex problems and deliver innovative solutions.`;

    const info = roleDescriptions[decodedSkillName] || defaultDescription;
    setRoleInfo(info);
  };

  const loadSalaryInfo = (country: string) => {
    try {
      // Map skill names to common job titles for better salary accuracy
      const jobTitleMap: Record<string, string> = {
        javascript: "javascript developer",
        python: "python developer",
        react: "react developer",
        "ui/ux design": "ux designer",
        "ui/ux": "ux designer",
        "data analysis": "data analyst",
        "data analytics": "data analyst",
        "software development": "software developer",
        "web development": "web developer",
        "mobile development": "mobile developer",
        devops: "devops engineer",
        cybersecurity: "cybersecurity specialist",
        "quality assurance": "qa engineer",
        "product management": "product manager",
        "3d modeler": "3d artist",
      };

      // Try mapped title first, then skill name directly
      const skillLower = decodedSkillName.toLowerCase();
      let searchTitle = jobTitleMap[skillLower] || skillLower;

      // Calculate salary instantly using AI (no API call, no async needed)
      let salaryData = calculateAISalary(searchTitle, country);

      // If no results and searchTitle doesn't already include "developer", try with "developer" suffix
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

      // If still no results and searchTitle doesn't already include "engineer", try as "engineer"
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

      // Validate salary data before formatting
      if (
        salaryData &&
        (salaryData.min_salary || salaryData.max_salary) &&
        (salaryData.min_salary! > 0 || salaryData.max_salary! > 0)
      ) {
        const formatted = formatSalaryRange(salaryData);
        if (formatted && formatted !== "Salary data not available") {
          setSalaryInfo(formatted);
          return;
        }
      }

      // Fallback: try with generic title based on skill category
      const genericTitle =
        skillLower.includes("design") ||
        skillLower.includes("ui") ||
        skillLower.includes("ux")
          ? "ui/ux designer"
          : skillLower.includes("data") ||
              skillLower.includes("analyst") ||
              skillLower.includes("analytics")
            ? "data analyst"
            : skillLower.includes("manager") || skillLower.includes("product")
              ? "product manager"
              : skillLower.includes("security") || skillLower.includes("cyber")
                ? "cybersecurity specialist"
                : skillLower.includes("devops") || skillLower.includes("cloud")
                  ? "devops engineer"
                  : "software developer";

      const fallbackSalary = calculateAISalary(genericTitle, country);
      if (fallbackSalary.min_salary && fallbackSalary.max_salary) {
        const formatted = formatSalaryRange(fallbackSalary);
        setSalaryInfo(formatted);
      } else {
        // Last resort: use default software developer salary
        const defaultSalary = calculateAISalary("software developer", country);
        setSalaryInfo(formatSalaryRange(defaultSalary));
      }
    } catch (error) {
      console.error("Error calculating salary:", error);
      // Even on error, try to show a default salary
      try {
        const defaultSalary = calculateAISalary("software developer", country);
        setSalaryInfo(formatSalaryRange(defaultSalary));
      } catch (fallbackError) {
        setSalaryInfo("Salary data not available");
      }
    }
  };

  const loadPopularityData = async (country: string) => {
    try {
      // Fetch real market data with timeout (3 seconds max)
      const marketDataPromise = getCompleteMarketData(
        decodedSkillName,
        country,
      );
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });

      const marketData = await Promise.race([
        marketDataPromise,
        timeoutPromise,
      ]);

      if (marketData && marketData.insights) {
        // Use AI-generated insights
        const combinedText = `${marketData.insights.popularityText}\n\n${marketData.insights.demandText}`;
        setPopularityData(combinedText);
        setPopularityChartData(marketData.insights.chartData);
      } else {
        // Fallback to default data (already set, no need to update)
        // Keep the default data that was set initially
      }
    } catch (error) {
      console.error("Error loading popularity data:", error);
      // Keep default data that was already set
    }
  };

  const loadCourses = async (searchTerm: string = decodedSkillName) => {
    try {
      // Normalize skill name for better matching
      const skillNameLower = searchTerm.toLowerCase().trim();

      // Optimized query - only fetch needed fields and limit results
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, provider, level, duration, description, required_skills, image",
        )
        .or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,title.ilike.%${skillNameLower}%,description.ilike.%${skillNameLower}%`,
        )
        .limit(6); // Reduced from 10 to 6 for faster query

      if (error) {
        console.error("Supabase query error:", error);
        setCourses([]);
        return;
      }

      // Filter courses by checking if they match the skill/role
      let filteredCourses = [];

      if (data && data.length > 0) {
        filteredCourses = data.filter((course) => {
          const title = (course.title || "").toLowerCase();
          const description = (course.description || "").toLowerCase();
          const requiredSkills = course.required_skills || [];

          // Check if skill name appears in title or description
          const matchesTitleOrDescription =
            title.includes(skillNameLower) ||
            description.includes(skillNameLower) ||
            title.includes(searchTerm.toLowerCase()) ||
            description.includes(searchTerm.toLowerCase());

          // Check if skill is in required_skills array
          const matchesSkills =
            Array.isArray(requiredSkills) &&
            requiredSkills.some(
              (skill: string) =>
                skill.toLowerCase().includes(skillNameLower) ||
                skillNameLower.includes(skill.toLowerCase()),
            );

          return matchesTitleOrDescription || matchesSkills;
        });
      }

      if (filteredCourses.length > 0) {
        setCourses(
          filteredCourses.map((course) => ({
            id: course.id,
            title: course.title,
            provider: course.provider || "Unknown",
            level: course.level || "Beginner",
            duration: course.duration || "N/A",
            description: course.description || "",
            required_skills: course.required_skills || [],
            image: course.image || undefined,
          })),
        );
      } else {
        // No courses found - set empty array
        setCourses([]);
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    }
  };

  const generateProjectIdeas = (searchTerm: string = decodedSkillName) => {
    // Generate project ideas based on skill name (synchronous - instant)
    const projectIdeasMap: Record<string, string[]> = {
      JavaScript: [
        "Build a real-time chat application using WebSockets",
        "Create a task management app with drag-and-drop functionality",
        "Develop a weather dashboard with API integration",
        "Build an e-commerce product catalog with filtering",
        "Create an interactive data visualization dashboard",
      ],
      Python: [
        "Build a web scraper to analyze market trends",
        "Create a machine learning model for predictions",
        "Develop a REST API with Flask or Django",
        "Build a data analysis tool for business insights",
        "Create an automation script for repetitive tasks",
      ],
      React: [
        "Build a portfolio website with animations",
        "Create a social media dashboard with real-time updates",
        "Develop a todo app with state management",
        "Build an e-commerce checkout flow",
        "Create an interactive data table with sorting and filtering",
      ],
      "UI/UX Design": [
        "Design a mobile app interface for a fitness tracker",
        "Create a website redesign for a local business",
        "Design a complete design system and component library",
        "Create wireframes and prototypes for a SaaS product",
        "Design an accessible checkout flow for e-commerce",
      ],
      "Data Analysis": [
        "Analyze sales data to identify trends and patterns",
        "Create visualizations for a business dashboard",
        "Perform statistical analysis on survey data",
        "Build a predictive model for customer behavior",
        "Analyze social media engagement metrics",
      ],
    };

    const defaultIdeas = [
      `Create a ${searchTerm} portfolio project`,
      `Build a real-world application using ${searchTerm}`,
      `Develop a ${searchTerm} tool or utility`,
      `Contribute to an open-source ${searchTerm} project`,
      `Create a ${searchTerm} tutorial or course`,
    ];

    const ideas = projectIdeasMap[searchTerm] || defaultIdeas;
    setProjectIdeas(ideas);
  };

  const handleCountryChange = (country: string) => {
    setActiveCountry(country);
    
    const matchedProfessionWrapper = location.state?.profession as MatchedProfession | undefined;
    const professionDetails = matchedProfessionWrapper?.profession;

    if (professionDetails && professionDetails.salary_info) {
       const salaryEntry = professionDetails.salary_info[country];

       if (salaryEntry) {
           setSalaryInfo(salaryEntry.display);
           setSalaryCurrency(salaryEntry.currency);
       }
    }
  };

  const loadJobs = async (country: string, searchTerm: string = decodedSkillName) => {
    try {
      const filters: JobFilters = {
        country: country,
        countries: [],
        jobTypes: [],
        isRemote: false,
        datePosted: undefined,
        skills: [searchTerm],
        salaryMin: undefined,
        salaryMax: undefined,
        salaryByAgreement: false,
      };

      // Fetch jobs with timeout to prevent hanging (5 seconds max)
      const jobsPromise = jobService.fetchActiveJobs({
        query: searchTerm,
        filters: filters,
        page: 1,
        pageSize: 5,
      });

      const timeoutPromise = new Promise<{ jobs: ApiJob[] }>((resolve) => {
        setTimeout(() => resolve({ jobs: [] }), 5000);
      });

      const jobsResponse = await Promise.race([jobsPromise, timeoutPromise]);
      // Filter to only allowed ATS platforms
      const allowedATSJobs = filterATSJobs(jobsResponse.jobs);
      setJobs(allowedATSJobs.slice(0, 5));
    } catch (error) {
      console.error("Error loading jobs:", error);
      setJobs([]); // Set empty array on error
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading skill path details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const salaryCountries = Object.keys(matchedProfession?.profession?.salary_info || {});
  const selectedSalary = matchedProfession?.profession?.salary_info?.[activeCountry];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Skill Name and Role Information - Unified */}
        <Card className="border-none shadow-none rounded-3xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {pageTitle || decodedSkillName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-muted-foreground leading-relaxed mb-2"
              style={
                isDescriptionExpanded
                  ? undefined
                  : {
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }
              }
            >
              {roleInfo}
            </p>
            {roleInfo.length > 140 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                className="text-sm font-medium text-breneo-blue hover:underline mb-4"
              >
                {isDescriptionExpanded ? "Read less" : "Read more"}
              </button>
            )}
            {matchedProfession?.profession?.skills && matchedProfession.profession.skills.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {matchedProfession.profession.skills.map((skill, index) => {
                  const selected = userSkillSet.has(normalizeSkillName(skill));
                  return (
                    <Badge
                      key={index}
                      variant="outline"
                      className={cn(
                        "transition-colors capitalize px-4 py-2 text-sm min-h-[2.25rem] rounded-lg select-none",
                        selected
                          ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700"
                          : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
                      )}
                    >
                      {skill}
                      {selected && (
                        <CheckCircle2 className="ml-2 h-4 w-4 inline-block" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary and Popularity Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-50 dark:bg-gray-800/50 border-none shadow-none rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <CardTitle className="flex items-center gap-3 text-m font-semibold text-muted-foreground">
                <DollarSign className="h-6 w-6 text-primary" />
                Salary Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-40 sm:shrink-0">
                  <div className="space-y-1">
                    {salaryCountries.length > 0 ? (
                      salaryCountries.map((country) => (
                        <button
                          key={country}
                          onClick={() => handleCountryChange(country)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                            activeCountry === country
                              ? "bg-breneo-blue/10 text-breneo-blue"
                              : "text-gray-600 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-breneo-blue"
                          }`}
                        >
                          {country}
                        </button>
                      ))
                    ) : (
                      <button className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium bg-breneo-blue/10 text-breneo-blue">
                        {userCountry}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Estimated Monthly Range
                    </p>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                      {salaryInfo}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Salary in {activeCountry} ({salaryCurrency})
                    </p>
                  </div>

                  {selectedSalary && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border bg-background/70 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Minimum
                        </p>
                        <p className="font-semibold text-sm mt-1">
                          {selectedSalary.currency}
                          {selectedSalary.min.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Maximum
                        </p>
                        <p className="font-semibold text-sm mt-1">
                          {selectedSalary.currency}
                          {selectedSalary.max.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800/50 border-none shadow-none rounded-3xl">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">              <CardTitle className="flex items-center gap-3 text-m font-semibold text-muted-foreground">
                <TrendingUp className="h-6 w-6 text-green-600" />
                Market Popularity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {popularityData}
              </p>

              {/* Last 5 Year Popularity Chart - Modern Area Chart */}
              <div className="mt-6 h-[220px] w-full max-w-[520px] mx-auto relative">
                {popularityChartData.length > 1 && (
                <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +
                  {Math.round(
                    ((popularityChartData[popularityChartData.length - 1].popularity -
                      popularityChartData[0].popularity) /
                      popularityChartData[0].popularity) *
                      100
                  )}
                  %
                </div>
              )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={popularityChartData}
                    margin={{ top: 10, right: 20, left: 20, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="colorPopularity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                       dataKey="year" 
                       axisLine={false}
                       tickLine={false}
                       tickMargin={8}
                       tick={{ fontSize: 12, fill: '#6b7280' }}
                       interval={0} 
                       padding={{ left: 18, right: 18 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.year}:
                              </span>
                              <span className="font-bold ml-1">
                                {payload[0].value}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="popularity"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPopularity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relevant Courses */}
        <Card className="border-none shadow-none rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Relevant Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:bg-primary/5 hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <CardContent className="p-4">
                    <h5 className="font-semibold text-sm mb-2">
                      {course.title}
                    </h5>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {course.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {course.duration}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        by {course.provider}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {courses.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No relevant courses available
                </p>
                <p className="text-sm text-muted-foreground">
                  We couldn't find any courses specifically for{" "}
                  {decodedSkillName} at the moment. Check back later or explore
                  our general course catalog.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Ideas */}
        <Card className="border-none shadow-none rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Project Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Build these projects after completing courses to strengthen your
              skills:
            </p>
            <div className="space-y-3">
              {projectIdeas.map((idea, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-muted rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm">{idea}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Relevant Jobs */}
        <Card className="border-none shadow-none rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Relevant Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((jobListing) => {
                  const jobId =
                    jobListing.job_id ||
                    jobListing.id ||
                    `job-${Math.random()}`;
                  const jobTitle =
                    jobListing.job_title ||
                    jobListing.title ||
                    "Untitled Position";
                  const companyName =
                    jobListing.employer_name ||
                    jobListing.company_name ||
                    (typeof jobListing.company === "string"
                      ? jobListing.company
                      : "Unknown Company");
                  const location =
                    jobListing.job_city && jobListing.job_state
                      ? `${jobListing.job_city}, ${jobListing.job_state}`
                      : jobListing.job_city ||
                        jobListing.job_state ||
                        jobListing.location ||
                        "Location not specified";
                  const applyLink =
                    jobListing.job_apply_link ||
                    jobListing.apply_link ||
                    jobListing.url ||
                    "#";
                  const companyLogo =
                    jobListing.employer_logo ||
                    jobListing.company_logo ||
                    jobListing.logo_url ||
                    "";

                  let salary = "By agreement";
                  const minSalary =
                    jobListing.job_min_salary || jobListing.min_salary;
                  const maxSalary =
                    jobListing.job_max_salary || jobListing.max_salary;
                  const salaryCurrency =
                    jobListing.job_salary_currency ||
                    jobListing.salary_currency ||
                    "$";

                  if (
                    minSalary &&
                    maxSalary &&
                    typeof minSalary === "number" &&
                    typeof maxSalary === "number"
                  ) {
                    salary = `${salaryCurrency}${minSalary.toLocaleString()} - ${salaryCurrency}${maxSalary.toLocaleString()}`;
                  } else if (minSalary && typeof minSalary === "number") {
                    salary = `${salaryCurrency}${minSalary.toLocaleString()}+`;
                  }

                  return (
                    <Card
                      key={jobId}
                      className="hover:bg-primary/5 hover:shadow-soft transition-all cursor-pointer"
                      onClick={() => navigate(`/jobs/${jobId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {companyLogo && (
                            <img
                              src={companyLogo}
                              alt={companyName}
                              className="w-12 h-12 rounded-lg object-contain flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-sm mb-1 line-clamp-1">
                              {jobTitle}
                            </h5>
                            <p className="text-xs text-muted-foreground mb-2">
                              {companyName} • {location}
                            </p>
                            {salary && (
                              <Badge variant="secondary" className="text-xs">
                                {salary}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(applyLink, "_blank");
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No jobs found for this skill. Check back later!
              </p>
            )}
            {jobs.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  navigate(
                    `/jobs?search=${encodeURIComponent(decodedSkillName)}`,
                  );
                }}
              >
                View More Jobs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SkillPathDetailPage;
