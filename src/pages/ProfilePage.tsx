import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const isMobile = useMobile();

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url")
        .eq("id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch saved courses
  const { data: savedCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ["savedCoursesList", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_courses")
        .select("courses(*)")
        .eq("user_id", user.id);
      if (error) return [];
      return data.map((item: any) => item.courses);
    },
    enabled: !!user,
  });

  // Fetch saved jobs
  const { data: savedJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["savedJobsList", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_data")
        .eq("user_id", user.id);
      if (error) return [];
      return data.map((item) => item.job_data);
    },
    enabled: !!user,
  });

  // Fetch user progress data for the new card
  const { data: userData } = useQuery({
    queryKey: ["userProgress", user?.id],
    queryFn: async () => {
      if (!user) return { skillTestTaken: false, enrolledCourses: 0 };

      const { data: testAnswers, error: testError } = await supabase
        .from("usertestanswers")
        .select("id")
        .eq("userid", user.id)
        .limit(1);

      const enrolledCourses = 0; // Placeholder

      if (testError) {
        console.error("Error fetching skill test status:", testError);
      }

      return {
        skillTestTaken: (testAnswers?.length ?? 0) > 0,
        enrolledCourses,
      };
    },
    enabled: !!user,
  });

  // Calculate profile completion percentage
  const profileCompletion = React.useMemo(() => {
    let score = 0;
    if (profile?.full_name) score += 50;
    if (profile?.profile_photo_url) score += 50;
    return score;
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="pt-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 md:h-24 md:w-24">
                <AvatarImage src={profile?.profile_photo_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {profile?.full_name || user?.email}
                </h1>
                <p className="text-sm md:text-base text-gray-500">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size={isMobile ? "icon" : "default"}
                aria-label="Settings"
                asChild
              >
                <Link to="/settings">
                  <Settings className={isMobile ? "h-4 w-4" : "h-4 w-4 mr-2"} />
                  {!isMobile && "Settings"}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                size={isMobile ? "icon" : "default"}
                aria-label="Logout"
              >
                <LogOut className={isMobile ? "h-4 w-4" : "h-4 w-4 mr-2"} />
                {!isMobile && "Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="rounded-[24px]">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-lg md:text-xl">
                  Your Progress
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Track your journey with Breneo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm md:text-base font-medium">
                        Profile Completion
                      </span>
                      <span className="text-sm md:text-base text-gray-500">
                        {profileCompletion}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm md:text-base font-medium">
                        Skill Assessment
                      </span>
                      <span className="text-sm md:text-base text-gray-500">
                        {userData?.skillTestTaken ? "Completed" : "Not Started"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm md:text-base font-medium">
                        Courses Progress
                      </span>
                      <span className="text-sm md:text-base text-gray-500">
                        {userData?.enrolledCourses ?? 0}/5
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-6 text-center">
                  <p className="text-xs md:text-sm text-gray-500 mb-3">
                    Complete your profile and skill assessment for better
                    recommendations
                  </p>
                  <Button
                    variant="outline"
                    className="text-breneo-blue rounded-[24px] text-sm md:text-base w-full sm:w-auto"
                    asChild
                  >
                    <Link to="/settings">Update Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 pb-16">
            <Tabs defaultValue="saved-courses">
              <TabsList>
                <TabsTrigger value="saved-courses">Saved Courses</TabsTrigger>
                <TabsTrigger value="saved-jobs">Saved Jobs</TabsTrigger>
              </TabsList>
              <TabsContent value="saved-courses">
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coursesLoading ? (
                      <p>Loading...</p>
                    ) : (
                      <div className="space-y-4">
                        {savedCourses?.map((course: any) => (
                          <div
                            key={course.id}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <h3 className="font-medium">{course.title}</h3>
                              <p className="text-sm text-gray-500">
                                {course.provider}
                              </p>
                            </div>
                            <Button asChild>
                              <Link to="/courses">View</Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="saved-jobs">
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsLoading ? (
                      <p>Loading...</p>
                    ) : (
                      <div className="space-y-4">
                        {savedJobs?.map((job: any) => (
                          <div
                            key={job.id}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <h3 className="font-medium">{job.title}</h3>
                              <p className="text-sm text-gray-500">
                                {job.company}
                              </p>
                            </div>
                            <Button
                              onClick={() => window.open(job.url, "_blank")}
                            >
                              Apply
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
