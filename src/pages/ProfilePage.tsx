import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const ProfilePage = () => {
  const { user } = useAuth();

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

  const { data: savedCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ["savedCoursesList", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_courses")
        .select("courses(*)")
        .eq("user_id", user.id);
      if (error) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => item.courses);
    },
    enabled: !!user,
  });

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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.profile_photo_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.full_name || user?.email}
              </h1>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

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
                  <p>Loading saved courses...</p>
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
                  <p>Loading saved jobs...</p>
                ) : (
                  <div className="space-y-4">
                    {savedJobs?.map((job: any) => (
                      <div
                        key={job.id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <h3 className="font-medium">{job.title}</h3>
                          <p className="text-sm text-gray-500">{job.company}</p>
                        </div>
                        <Button onClick={() => window.open(job.url, "_blank")}>
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
    </DashboardLayout>
  );
};

export default ProfilePage;
