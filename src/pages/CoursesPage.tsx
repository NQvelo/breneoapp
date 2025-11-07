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
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { createAcademySlug } from "@/utils/academyUtils";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url?: string;
  contact_email?: string;
  logo_url?: string;
  profile_photo_url?: string;
  slug?: string;
}

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
  academy_profiles?: { slug?: string } | null;
  academy_profile_data?: AcademyProfile | null;
}

const CoursesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentTab, setCurrentTab] = React.useState("all");
  const navigate = useNavigate(); // Initialize the navigate function

  const isValidUUID = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }, []);

  const userId = typeof user?.id === "string" ? user.id : null;
  const canUseUserId = React.useMemo(
    () => (userId ? isValidUUID(userId) : false),
    [userId, isValidUUID]
  );

  const { data: savedCourses = [] } = useQuery({
    queryKey: ["savedCourses", userId],
    queryFn: async () => {
      if (!userId || !canUseUserId) return [];
      const { data, error } = await supabase
        .from("saved_courses")
        .select("course_id")
        .eq("user_id", userId);
      if (error) {
        console.error("Error fetching saved courses:", error);
        return [];
      }
      return data.map((item) => item.course_id);
    },
    enabled: canUseUserId,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", savedCourses],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }

      const coursesWithSaved = (data?.map((course) => ({
        ...course,
        match: 0,
        topics: course.topics || [],
        required_skills: course.required_skills || [],
        is_saved: savedCourses.includes(course.id),
      })) || []) as Course[];

      // Get unique academy_ids
      const uniqueAcademyIds = [
        ...new Set(
          coursesWithSaved
            .map((c) => c.academy_id)
            .filter((id): id is string => !!id)
        ),
      ];

      // Fetch academy profiles from Supabase first to get basic data and slugs
      const supabaseAcademyProfilesMap = new Map<string, AcademyProfile>();
      const apiAcademyProfilesMap = new Map<string, AcademyProfile>();

      if (uniqueAcademyIds.length > 0) {
        // Step 1: Fetch academy profiles from Supabase to get basic data
        const { data: academyProfiles, error: academyProfilesError } =
          await supabase
            .from("academy_profiles")
            .select(
              "id, academy_name, description, website_url, contact_email, logo_url"
            )
            .in("id", uniqueAcademyIds);

        if (academyProfilesError) {
          console.warn(
            "Error fetching academy profiles from Supabase:",
            academyProfilesError
          );
        } else if (academyProfiles) {
          academyProfiles.forEach((profile) => {
            const slug = createAcademySlug(profile.academy_name || "");
            supabaseAcademyProfilesMap.set(profile.id, {
              id: profile.id,
              academy_name: profile.academy_name || "",
              description: profile.description || "",
              website_url: profile.website_url || undefined,
              contact_email: profile.contact_email || undefined,
              logo_url: profile.logo_url || undefined,
              slug: slug,
            });
          });
        }

        // Step 2: Fetch academy data from Django API using academy_id
        await Promise.all(
          uniqueAcademyIds.map(async (academyId) => {
            const supabaseData = supabaseAcademyProfilesMap.get(academyId);

            try {
              const response = await apiClient.get(
                `${API_ENDPOINTS.ACADEMY.PROFILE}${academyId}/`
              );

              if (response.data) {
                const data = response.data as Record<string, unknown>;
                const getStringField = (field: string) => {
                  const value = data[field];
                  return typeof value === "string" ? value : undefined;
                };

                const academyIdFromApi =
                  getStringField("id") || getStringField("academy_id");
                const academyNameFromApi =
                  getStringField("academy_name") ||
                  getStringField("name") ||
                  getStringField("first_name") ||
                  getStringField("firstName");

                const descriptionFromApi = getStringField("description");
                const websiteFromApi = getStringField("website_url");
                const contactEmailFromApi = getStringField("contact_email");
                const logoFromApi =
                  getStringField("logo_url") ||
                  getStringField("profile_photo_url") ||
                  getStringField("image");
                const profilePhotoFromApi =
                  getStringField("profile_photo_url") ||
                  getStringField("image");
                const slugFromApi = getStringField("slug");

                apiAcademyProfilesMap.set(academyId, {
                  id: academyIdFromApi || academyId,
                  academy_name:
                    academyNameFromApi || supabaseData?.academy_name || "",
                  description:
                    descriptionFromApi || supabaseData?.description || "",
                  website_url: websiteFromApi || supabaseData?.website_url,
                  contact_email:
                    contactEmailFromApi || supabaseData?.contact_email,
                  logo_url: logoFromApi || supabaseData?.logo_url,
                  profile_photo_url:
                    profilePhotoFromApi || supabaseData?.logo_url,
                  slug:
                    slugFromApi ||
                    supabaseData?.slug ||
                    createAcademySlug(
                      academyNameFromApi || supabaseData?.academy_name || ""
                    ),
                });
              }
            } catch (error) {
              console.debug(
                `Could not fetch academy profile for ${academyId} from Django API, using Supabase data`
              );
            }
          })
        );
      }

      // Join academy profile data with courses
      // Prefer API data, fallback to Supabase data
      return coursesWithSaved.map((course) => {
        const apiAcademyData = course.academy_id
          ? apiAcademyProfilesMap.get(course.academy_id)
          : null;
        const supabaseAcademyData = course.academy_id
          ? supabaseAcademyProfilesMap.get(course.academy_id)
          : null;

        let academyProfileData: AcademyProfile | null = null;

        if (apiAcademyData) {
          // Use API data (enriched with latest info)
          academyProfileData = apiAcademyData;
        } else if (supabaseAcademyData) {
          // Fallback to Supabase data
          academyProfileData = {
            id: supabaseAcademyData.id,
            academy_name:
              supabaseAcademyData.academy_name || course.provider || "",
            description: supabaseAcademyData.description || "",
            website_url: supabaseAcademyData.website_url,
            contact_email: supabaseAcademyData.contact_email,
            logo_url: supabaseAcademyData.logo_url,
            slug: supabaseAcademyData.slug,
          };
        }

        return {
          ...course,
          academy_profile_data: academyProfileData,
        };
      });
    },
    enabled: !!savedCourses,
  });

  const { data: userSkills } = useQuery({
    queryKey: ["userSkills", userId],
    queryFn: async () => {
      if (!userId || !canUseUserId) return [];
      const { data: answers, error } = await supabase
        .from("usertestanswers")
        .select("*")
        .eq("userid", userId);
      if (error || !answers || answers.length === 0) return [];
      const skillScores = calculateSkillScores(answers);
      return getTopSkills(skillScores, 10).map((skill) => skill.skill);
    },
    enabled: canUseUserId,
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
      if (!userId) throw new Error("User not logged in");
      if (course.is_saved) {
        const { error } = await supabase
          .from("saved_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_courses")
          .insert({ user_id: userId, course_id: course.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["savedCourses", userId] });
      toast({
        title: variables.is_saved ? "Course Unsaved" : "Course Saved",
        description: `"${variables.title}" has been updated.`,
        duration: 1750, // Auto-dismiss after 1.75 seconds
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
        duration: 2000, // Auto-dismiss after 2 seconds
      });
    },
  });

  const filteredCourses = coursesWithMatches.filter((course) => {
    const academyName =
      course.academy_profile_data?.academy_name || course.provider || "";
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-32 md:pb-16">
          {coursesLoading ? (
            <p>Loading courses...</p>
          ) : (
            filteredCourses.map((course) => {
              // Get academy details from joined profile data or fallback
              const academyProfileName =
                course.academy_profile_data?.academy_name || "";
              const academySlugFromDb = course.academy_profile_data?.slug;
              const academyName =
                academyProfileName || course.provider || "Unknown Academy";

              // Generate slug from academy name if not available in database
              const academySlug =
                academySlugFromDb ||
                (academyProfileName
                  ? createAcademySlug(academyName)
                  : undefined);

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
                      {academyProfileName && academySlug ? (
                        <Link
                          to={`/academy/${academySlug}`}
                          className="hover:underline text-blue-600 font-medium"
                        >
                          {academyName}
                        </Link>
                      ) : (
                        <span>{academyName}</span>
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
