import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bookmark,
  MoreVertical,
  ChevronRight,
  Clock,
  ChevronLeft,
  GraduationCap,
  Award,
  Play,
  ClipboardCheck,
  Target,
} from "lucide-react";
import {
  getUserTestAnswers,
  calculateSkillScores,
  getTopSkills,
} from "@/utils/skillTestUtils";
import apiClient from "@/api/auth/apiClient";

// API Job structure from JSearch
interface ApiJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link?: string;
  employer_logo?: string;
}

// Transformed Job for UI
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  date: string;
  logo?: string;
  salary?: string;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
}

interface Webinar {
  id: string;
  title: string;
  company: string;
  time: string;
  date: string;
  logo?: string;
}

const JSEARCH_API_KEY = "329754c88fmsh45bf2cd651b0e37p1ad384jsnab7fd582cddb";

// Fetch jobs from JSearch API with skill-based filtering
const fetchJobs = async (topSkills: string[] = []) => {
  // Build query based on top skills
  let query = "developer"; // Default fallback
  if (topSkills.length > 0) {
    // Use top 3 skills for the query
    const skillsQuery = topSkills.slice(0, 3).join(" ");
    query = skillsQuery;
  }

  const params = new URLSearchParams({
    query: query,
    page: "1",
    num_pages: "1",
  });

  const API_ENDPOINT = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    headers: {
      "X-Rapidapi-Key": JSEARCH_API_KEY,
      "X-Rapidapi-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const result = await response.json();
  return result.data || [];
};

const UserHome = () => {
  const { user } = useAuth();
  const [currentJobPage, setCurrentJobPage] = useState(0);
  const [userTopSkills, setUserTopSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);

  // Fetch user's top skills from skill test results
  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!user) {
        setLoadingSkills(false);
        setHasCompletedTest(false);
        return;
      }

      try {
        setLoadingSkills(true);
        
        // Method 1: Try Django backend skill test results API (same as ProfilePage)
        try {
          const response = await apiClient.get(`/api/skilltest/results/?user=${user.id}`);
          console.log("🔍 Checking Django API skill test results:", response.data);
          
          let skillTestData = null;
          if (Array.isArray(response.data) && response.data.length > 0) {
            skillTestData = response.data[0];
          } else if (response.data && typeof response.data === "object") {
            skillTestData = response.data;
          }
          
          if (skillTestData && (skillTestData.final_role || skillTestData.skills_json)) {
            console.log("✅ Found skill test results from Django API");
            setHasCompletedTest(true);
            
            // Extract skills from skills_json
            const skillsJson = skillTestData.skills_json || {};
            const techSkills = Object.keys(skillsJson.tech || {});
            const softSkills = Object.keys(skillsJson.soft || {});
            const allSkills = [...techSkills, ...softSkills].slice(0, 5);
            setUserTopSkills(allSkills);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          console.log("Django API endpoint not available, trying other methods...");
        }
        
        // Method 2: Try user skills API endpoint
        try {
          const response = await apiClient.get(`/api/user/${user.id}/skills`);
          if (response.data && response.data.skills) {
            const topSkills = response.data.skills.slice(0, 5);
            setUserTopSkills(topSkills);
            setHasCompletedTest(topSkills.length > 0);
            setLoadingSkills(false);
            return;
          }
        } catch (apiError) {
          console.log("User skills API endpoint not available, trying Supabase...");
        }

        // Method 3: Fallback to Supabase: fetch from usertestanswers
        const answers = await getUserTestAnswers(String(user.id));
        console.log("🔍 Checking test completion:", {
          userId: user.id,
          answersCount: answers?.length || 0,
          hasAnswers: answers && answers.length > 0
        });
        
        if (answers && answers.length > 0) {
          console.log("✅ User has completed skill test (from Supabase)");
          setHasCompletedTest(true);
          const skillScores = calculateSkillScores(answers);
          const topSkillsData = getTopSkills(skillScores, 5);
          const topSkills = topSkillsData.map((s) => s.skill);
          setUserTopSkills(topSkills);
        } else {
          console.log("❌ User has not completed skill test");
          setHasCompletedTest(false);
        }
      } catch (error) {
        console.error("Error fetching user skills:", error);
        setHasCompletedTest(false);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchUserSkills();
  }, [user]);

  // Fetch jobs based on user's top skills
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["home-jobs", userTopSkills.join(",")],
    queryFn: () => fetchJobs(userTopSkills),
    enabled: !!user && !loadingSkills,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    onError: (error) => {
      console.error("Error fetching jobs:", error);
    },
  });

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Mock webinars data (since we don't have a webinars table yet)
  const mockWebinars: Webinar[] = [
    {
      id: "1",
      title: "Career Growth Strategies",
      company: "Breneo Academy",
      time: "14:00 - 15:00",
      date: "15 Dec",
    },
    {
      id: "2",
      title: "Tech Skills Workshop",
      company: "Tech Experts",
      time: "16:00 - 17:00",
      date: "15 Dec",
    },
    {
      id: "3",
      title: "Digital Marketing Bootcamp",
      company: "Marketing Pro",
      time: "18:00 - 19:00",
      date: "15 Dec",
    },
  ];

  // Transform jobs - handle empty or undefined arrays
  const transformedJobs: Job[] = (jobs || []).slice(0, 6).map((job: ApiJob) => {
    const location = [job.job_city, job.job_state, job.job_country]
      .filter(Boolean)
      .join(", ") || "Location not specified";

    return {
      id: job.job_id || `job-${Math.random()}`,
      title: job.job_title || "Untitled Position",
      company: job.employer_name || "Unknown Company",
      location,
      logo: job.employer_logo,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  });

  // Get current page jobs (3 per page)
  const currentJobs = transformedJobs.slice(
    currentJobPage * 3,
    currentJobPage * 3 + 3
  );

  const canGoNext = currentJobPage < Math.ceil(transformedJobs.length / 3) - 1;
  const canGoPrev = currentJobPage > 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-20 md:pb-6 px-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Top Jobs and Courses */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Top Job Picks Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Top job picks for you
                  </h2>
                  {userTopSkills.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Matched based on your skills:{" "}
                      <span className="font-medium text-breneo-blue">
                        {userTopSkills.slice(0, 3).join(", ")}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentJobPage((p) => Math.max(0, p - 1))}
                    disabled={!canGoPrev}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentJobPage((p) => p + 1)}
                    disabled={!canGoNext}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {jobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : jobsError ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 mb-2">
                      Unable to load jobs at the moment.
                    </p>
                    <p className="text-sm text-gray-400">
                      Please try again later.
                    </p>
                  </CardContent>
                </Card>
              ) : currentJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">
                      No jobs found. Try adjusting your search criteria.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="relative hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="absolute top-4 left-4">
                          <Bookmark className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="absolute top-4 right-4">
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="mt-8 mb-3">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            ${Math.floor(Math.random() * 200 + 200)}/hr
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {job.logo ? (
                            <img
                              src={job.logo}
                              alt={job.company}
                              className="w-8 h-8 rounded-full object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-breneo-blue/10 flex items-center justify-center">
                              <span className="text-breneo-blue font-semibold text-xs">
                                {job.company.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-600">
                            {job.company}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">{job.date}</p>

                        <div className="flex justify-end mt-4">
                          <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Top Courses Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-breneo-blue" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Top courses picked for you
                  </h2>
                </div>
                {userTopSkills.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Based on:</span>
                    <div className="flex gap-1">
                      {userTopSkills.slice(0, 2).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs bg-breneo-blue/10 text-breneo-blue border-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative">
                      <CardContent className="p-0">
                        <Skeleton className="h-40 w-full rounded-t-lg" />
                        <div className="p-4">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2 mb-3" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No courses available at the moment.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.slice(0, 3).map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`}>
                      <Card className="relative hover:shadow-lg transition-all duration-200 cursor-pointer group border border-gray-200 hover:border-breneo-blue/30">
                        <CardContent className="p-0 overflow-hidden">
                          <div className="relative">
                            <img
                              src={course.image || "/placeholder.svg"}
                              alt={course.title}
                              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <div className="absolute top-4 right-4">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5">
                                <Bookmark className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            {course.category && (
                              <div className="absolute top-4 left-4">
                                <Badge className="bg-breneo-blue text-white text-xs">
                                  {course.category}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-breneo-blue transition-colors">
                              {course.title}
                            </h3>

                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="h-3 w-3 text-breneo-blue" />
                              </div>
                              <span className="text-xs text-gray-600 font-medium">
                                {course.provider || "Breneo Academy"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              {course.duration && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{course.duration}</span>
                                </div>
                              )}
                              {course.level && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300"
                                >
                                  <Award className="h-3 w-3 mr-1" />
                                  {course.level}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-500">
                                View details
                              </span>
                              <button className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-breneo-blue group-hover:text-white flex items-center justify-center transition-colors">
                                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Skill Test CTA and Webinars */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-24 space-y-6">
              {/* Skill Test CTA Section - Only show if user hasn't completed the test */}
              {!hasCompletedTest && !loadingSkills && (
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <Link to="/skill-test" className="block cursor-pointer group">
                      <div className="flex flex-col items-center gap-4">
                        {/* Illustration */}
                        <div className="w-full relative max-h-40 flex items-center justify-center">
                          <img
                            src="/lovable-uploads/Bring-Solutions-To-Problems--Streamline-New-York (1).png"
                            alt="Discover Your Skills"
                            className="w-auto h-40 object-contain"
                            onError={(e) => {
                              // Fallback to placeholder if image doesn't exist yet
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 text-center w-full">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <ClipboardCheck className="h-5 w-5 text-breneo-blue" />
                            <h2 className="text-xl font-bold text-gray-900">
                              Discover Your Skills
                            </h2>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            Take our comprehensive skill assessment to unlock personalized job recommendations and course suggestions tailored to your strengths.
                          </p>
                          <div className="flex items-center justify-center">
                            <Button className="bg-breneo-blue hover:bg-breneo-blue/90">
                              <Play className="h-5 w-5" />
                              Start Skill Test
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Skill Path CTA Section - Only show if user has completed the test */}
              {hasCompletedTest && !loadingSkills && (
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <Link to="/skill-path" className="block cursor-pointer group">
                      <div className="flex flex-col items-center gap-4">
                        {/* Illustration */}
                        <div className="w-full relative max-h-40 flex items-center justify-center">
                          <img
                            src="/lovable-uploads/Bring-Solutions-To-Problems--Streamline-New-York (1).png"
                            alt="Your Skill Path"
                            className="w-auto h-40 object-contain"
                            onError={(e) => {
                              // Fallback to placeholder if image doesn't exist yet
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 text-center w-full">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Target className="h-5 w-5 text-breneo-blue" />
                            <h2 className="text-xl font-bold text-gray-900">
                              Your Skill Path
                            </h2>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            Explore your personalized career path with job recommendations, course suggestions, and skill development insights based on your assessment.
                          </p>
                          <div className="flex items-center justify-center">
                            <Button className="bg-breneo-blue hover:bg-breneo-blue/90">
                              <Target className="h-5 w-5 mr-2" />
                              View Skill Path
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Webinars Section */}
              <Card className="bg-white">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Webinars
                  </h2>

                  {/* Calendar/Date Picker */}
                  <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
                    {[
                      { day: "Sun", date: "01" },
                      { day: "Mon", date: "02" },
                      { day: "Tue", date: "03" },
                      { day: "Wed", date: "04" },
                      { day: "Thu", date: "05" },
                      { day: "Fri", date: "06" },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          idx === 0
                            ? "bg-breneo-blue text-white"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>{item.day}</span>
                        <span className="text-sm mt-1">{item.date}</span>
                      </button>
                    ))}
                  </div>

                  {/* Webinar List */}
                  <div className="space-y-4">
                    {mockWebinars.map((webinar) => (
                      <div
                        key={webinar.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-breneo-blue font-semibold text-sm">
                            {webinar.company.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {webinar.title}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{webinar.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserHome;
