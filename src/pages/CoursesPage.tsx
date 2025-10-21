import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateSkillScores, getTopSkills } from "@/utils/skillTestUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  match: number;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
  is_saved: boolean;
  academy_id: string | null;
  academy_profiles: { slug: string } | null;
}

const CoursesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentTab, setCurrentTab] = React.useState("all");
  const navigate = useNavigate(); // Initialize the navigate function

  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_courses")
        .select("course_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("Error fetching saved courses:", error);
        return [];
      }
      return data.map((item) => item.course_id);
    },
    enabled: !!user,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", savedCourses],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, academy_profiles(slug)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return (
        data?.map((course) => ({
          ...course,
          match: 0,
          topics: course.topics || [],
          required_skills: course.required_skills || [],
          is_saved: savedCourses.includes(course.id),
        })) || []
      );
    },
    enabled: !!savedCourses,
  });

  const { data: userSkills } = useQuery({
    queryKey: ["userSkills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: answers, error } = await supabase
        .from("usertestanswers")
        .select("*")
        .eq("userid", user.id);
      if (error || !answers || answers.length === 0) return [];
      const skillScores = calculateSkillScores(answers);
      return getTopSkills(skillScores, 10).map((skill) => skill.skill);
    },
    enabled: !!user,
  });

  const coursesWithMatches = React.useMemo(() => {
    if (!courses) return [];
    if (!userSkills || userSkills.length === 0) return courses;

    return courses
      .map((course) => {
        const matchingSkills = course.required_skills.filter((skill) =>
          userSkills.some(
            (userSkill) =>
              userSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(userSkill.toLowerCase())
          )
        );
        const matchPercentage =
          course.required_skills.length > 0
            ? Math.round(
                (matchingSkills.length / course.required_skills.length) * 100
              )
            : 50;
        return {
          ...course,
          match: Math.max(matchPercentage, 25),
        };
      })
      .sort((a, b) => b.match - a.match);
  }, [userSkills, courses]);

  const saveCourseMutation = useMutation({
    mutationFn: async (course: Course) => {
      if (!user) throw new Error("User not logged in");
      if (course.is_saved) {
        const { error } = await supabase
          .from("saved_courses")
          .delete()
          .eq("user_id", user.id)
          .eq("course_id", course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_courses")
          .insert({ user_id: user.id, course_id: course.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["savedCourses", user?.id] });
      toast({
        title: variables.is_saved ? "Course Unsaved" : "Course Saved",
        description: `"${variables.title}" has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const filteredCourses = coursesWithMatches.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase());
    if (currentTab === "all") return matchesSearch;
    if (currentTab === "enrolled") return matchesSearch && course.enrolled;
    if (currentTab === "recommended") return matchesSearch && course.match > 70;
    return false;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-2xl"
          />
        </div>

        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="mb-8"
        >
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
          {coursesLoading ? (
            <p>Loading courses...</p>
          ) : (
            filteredCourses.map((course) => {
              const academySlug = (course.academy_profiles as any)?.slug;
              return (
                <Card key={course.id} className="overflow-hidden group">
                  <div className="h-40 overflow-hidden">
                    <img
                      src={
                        course.image
                          ? course.image
                          : "lovable-uploads/no_photo.png"
                      }
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-medium text-lg mb-2">{course.title}</h3>
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                      {academySlug ? (
                        <Link
                          to={`/academy/${academySlug}`}
                          className="hover:underline text-blue-600 font-medium"
                        >
                          {course.provider}
                        </Link>
                      ) : (
                        <span>{course.provider}</span>
                      )}

                      <span>•</span>
                      <span>{course.level}</span>
                      <span>•</span>
                      <span>{course.duration}</span>
                    </div>
                    <p className="text-gray-700 text-sm mb-4">
                      {course.description}
                    </p>

                    <div className="flex justify-between items-center">
                      <Badge>{course.match}% Match</Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={course.enrolled ? "outline" : "default"}
                          onClick={() => {
                            if (!course.enrolled) {
                              navigate(`/course/${course.id}`);
                            }
                          }}
                        >
                          {course.enrolled ? "Continue" : "Enroll"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveCourseMutation.mutate(course)}
                          aria-label={
                            course.is_saved ? "Unsave course" : "Save course"
                          }
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              course.is_saved ? "fill-primary text-primary" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default CoursesPage;
