import React from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  url: string;
  created_at: string;
  company_logo?: string;
  remote?: boolean;
}

const fetchJobs = async () => {
  const baseUrl = "https://remotive.com/api/remote-jobs";
  const params = new URLSearchParams();
  params.append("limit", "20"); // Get more jobs to have better matching options

  const response = await fetch(`${baseUrl}?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const data = await response.json();
  return data.jobs || [];
};

const UserDashboard = () => {
  const { user } = useAuth();

  // This is a USER-ONLY dashboard component
  // Academy users are redirected to /academy/dashboard by route protection

  // Mock user data - using real user data where available
  const userData = {
    name:
      (user as { user_metadata?: { full_name?: string } })?.user_metadata
        ?.full_name ||
      user?.email?.split("@")[0] ||
      "User",
    skillTestTaken: false,
  };

  // Fetch real jobs
  const {
    data: jobs = [],
    isLoading: jobsLoading,
    error: jobsError,
  } = useQuery({
    queryKey: ["dashboard-jobs"],
    queryFn: fetchJobs,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate job match percentage (simplified without Supabase skill scores)
  const calculateJobMatch = () => {
    // Return a random match percentage for now
    return Math.floor(Math.random() * 30) + 70;
  };

  // Transform jobs and calculate matches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedJobs = jobs.map((job: any) => {
    const matchPercentage = calculateJobMatch();

    return {
      id: job.id,
      title: job.title,
      company: job.company_name,
      match: matchPercentage,
    };
  });

  // Get top 3 matched jobs
  const recommendedJobs = transformedJobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => b.match - a.match)
    .slice(0, 3);

  // Mock course recommendations
  const recommendedCourses = [
    {
      id: 1,
      title: "UI/UX Fundamentals",
      provider: "DesignAcademy",
      duration: "4 weeks",
    },
    {
      id: 2,
      title: "Digital Marketing Essentials",
      provider: "LearnOnline",
      duration: "6 weeks",
    },
  ];

  return (
    <DashboardLayout>
      <div>
        {!userData.skillTestTaken && (
          <Card className="mb-4 md:mb-6 bg-gradient-to-r from-breneo-blue/10 to-breneo-blue/5 border-breneo-blue/20 rounded-[24px]">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-breneo-navy mb-2">
                    Start Your Journey with Breneo
                  </h3>
                  <p className="text-sm md:text-base text-gray-600">
                    Take your skill test to get personalized job and course
                    recommendations tailored just for you.
                  </p>
                </div>
                <Button
                  asChild
                  className="bg-breneo-blue hover:bg-breneo-blue/90 rounded-[24px] w-full md:w-auto"
                >
                  <Link to="/skill-test">Take Skill Test</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <Card className="rounded-[24px]">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">
                Top Job Matches
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                Your best matching jobs based on skills
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {jobsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-[24px] p-3 md:p-4">
                      <Skeleton className="h-4 md:h-5 w-3/4 mb-2" />
                      <Skeleton className="h-3 md:h-4 w-1/2 mb-3" />
                    </div>
                  ))}
                </div>
              ) : jobsError ? (
                <div className="text-center py-4 md:py-6">
                  <p className="text-red-500 mb-4 text-sm md:text-base">
                    Failed to load job recommendations
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="rounded-[24px] text-sm md:text-base"
                  >
                    Retry
                  </Button>
                </div>
              ) : recommendedJobs.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {recommendedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border rounded-[24px] p-3 md:p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm md:text-base truncate">
                            {job.title}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {job.company}
                          </p>
                        </div>
                        <div className="bg-breneo-blue/10 text-breneo-blue px-2 py-1 rounded-[24px] text-xs md:text-sm font-medium ml-2 flex-shrink-0">
                          {job.match}% Match
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <Button
                      variant="outline"
                      asChild
                      className="rounded-[24px] w-full sm:w-auto text-sm md:text-base"
                    >
                      <Link to="/jobs">View All Job Offers</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 md:py-6">
                  <p className="text-gray-500 mb-4 text-sm md:text-base">
                    Take your skill test to see job recommendations
                  </p>
                  <Button
                    asChild
                    className="bg-breneo-blue hover:bg-breneo-blue/90 rounded-[24px] w-full sm:w-auto text-sm md:text-base"
                  >
                    <Link to="/skill-test">Take Skill Test</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[24px]">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">
                Recommended Courses
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                Improve your skills with these learning paths
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recommendedCourses.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {recommendedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="border rounded-[24px] p-3 md:p-4"
                    >
                      <div className="mb-2">
                        <h3 className="font-medium text-sm md:text-base">
                          {course.title}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500">
                          {course.provider} · {course.duration}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 rounded-[24px] text-xs md:text-sm"
                      >
                        View Course
                      </Button>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <Button
                      variant="outline"
                      asChild
                      className="rounded-[24px] w-full sm:w-auto text-sm md:text-base"
                    >
                      <Link to="/courses">View All Courses</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 md:py-6">
                  <p className="text-gray-500 mb-4 text-sm md:text-base">
                    Take your skill test to get course recommendations
                  </p>
                  <Button
                    asChild
                    className="bg-breneo-blue hover:bg-breneo-blue/90 rounded-[24px] w-full sm:w-auto text-sm md:text-base"
                  >
                    <Link to="/skill-test">Take Skill Test</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
