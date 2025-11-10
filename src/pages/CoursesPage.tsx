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
import { useAcademyColor } from "@/hooks/useAcademyColor";
import { hexToRgba, isDarkColor } from "@/utils/imageColorUtils";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url?: string;
  contact_email?: string;
  logo_url?: string;
  profile_photo_url?: string;
  profile_image_url?: string;
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

      // Fetch from Supabase (source of truth for saving)
      const { data, error } = await supabase
        .from("saved_courses")
        .select("course_id")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching saved courses from Supabase:", error);
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
              "id, academy_name, description, website_url, contact_email, logo_url, profile_photo_url, profile_image_url"
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
              profile_photo_url: profile.profile_photo_url || undefined,
              profile_image_url: profile.profile_image_url || undefined,
              slug: slug,
            });
          });
        }

        // Step 2: Fetch academy data from Django API using academy_id
        // Endpoint: /api/academy/<academy_id>/
        await Promise.all(
          uniqueAcademyIds.map(async (academyId) => {
            const supabaseData = supabaseAcademyProfilesMap.get(academyId);

            try {
              // Use the academy detail endpoint: /api/academy/<academy_id>/
              const response = await apiClient.get(
                `${API_ENDPOINTS.ACADEMY.DETAIL}${academyId}/`
              );

              if (response.data) {
                // API returns nested structure: { profile_data: {...}, profile_type: 'academy', ... }
                const responseData = response.data as Record<string, unknown>;
                const profileData =
                  (responseData.profile_data as Record<string, unknown>) ||
                  responseData;

                const getStringField = (
                  field: string,
                  source: Record<string, unknown> = profileData
                ) => {
                  const value = source[field];
                  return typeof value === "string" ? value : undefined;
                };

                // Debug: Log all available fields from API
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `[Academy ${academyId}] API Response structure:`,
                    {
                      hasProfileData: !!responseData.profile_data,
                      profileDataKeys: profileData
                        ? Object.keys(profileData)
                        : [],
                      fullResponse: responseData,
                    }
                  );
                }

                // Extract academy ID - check both profile_data and root level
                const academyIdFromApi =
                  getStringField("id", profileData) ||
                  getStringField("academy_id", profileData) ||
                  getStringField("id", responseData) ||
                  getStringField("academy_id", responseData) ||
                  academyId;

                // Extract academy name - 'name' field in profile_data
                const academyNameFromApi =
                  getStringField("academy_name", profileData) ||
                  getStringField("name", profileData) ||
                  getStringField("academy_name", responseData) ||
                  getStringField("name", responseData) ||
                  getStringField("first_name", profileData) ||
                  getStringField("firstName", profileData);

                const descriptionFromApi =
                  getStringField("description", profileData) ||
                  getStringField("description", responseData);
                const websiteFromApi =
                  getStringField("website_url", profileData) ||
                  getStringField("websiteUrl", profileData) ||
                  getStringField("website_url", responseData);
                const contactEmailFromApi =
                  getStringField("contact_email", profileData) ||
                  getStringField("contactEmail", profileData) ||
                  getStringField("email", profileData) ||
                  getStringField("contact_email", responseData);

                // Extract logo - check profile_data first
                const logoFromApi =
                  getStringField("logo_url", profileData) ||
                  getStringField("logoUrl", profileData) ||
                  getStringField("logo", profileData) ||
                  getStringField("logo_url", responseData) ||
                  getStringField("logoUrl", responseData);

                // Extract profile photo
                const profilePhotoFromApi =
                  getStringField("profile_photo_url", profileData) ||
                  getStringField("profilePhotoUrl", profileData) ||
                  getStringField("profile_photo", profileData) ||
                  getStringField("profilePhoto", profileData) ||
                  getStringField("profile_photo_url", responseData);

                // Extract profile image - try multiple variations
                const profileImageFromApi =
                  getStringField("profile_image_url", profileData) ||
                  getStringField("profileImageUrl", profileData) ||
                  getStringField("profile_image", profileData) ||
                  getStringField("profileImage", profileData) ||
                  getStringField("image_url", profileData) ||
                  getStringField("imageUrl", profileData) ||
                  getStringField("profile_image_url", responseData) ||
                  getStringField("profileImageUrl", responseData) ||
                  // Fallback to profile_photo if profile_image not found
                  profilePhotoFromApi;

                const slugFromApi =
                  getStringField("slug", profileData) ||
                  getStringField("slug", responseData);

                // Debug: Log what we found
                if (process.env.NODE_ENV === "development") {
                  console.log(`[Academy ${academyId}] Extracted values:`, {
                    academy_id: academyIdFromApi,
                    academy_name: academyNameFromApi,
                    profile_image_url: profileImageFromApi,
                    profile_photo_url: profilePhotoFromApi,
                    logo_url: logoFromApi,
                    description: descriptionFromApi,
                    email: contactEmailFromApi,
                  });
                }

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
                    profilePhotoFromApi || supabaseData?.profile_photo_url,
                  profile_image_url:
                    profileImageFromApi ||
                    supabaseData?.profile_image_url ||
                    supabaseData?.profile_photo_url,
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
      // Match courses to academies by academy_id:
      // - Courses come from Supabase (courses table with academy_id field)
      // - Academy data comes from API endpoint (/api/academy/<academy_id>/)
      // - If academy_id matches, the course belongs to that academy
      return coursesWithSaved.map((course) => {
        // Match course.academy_id with academy data from API
        const apiAcademyData = course.academy_id
          ? apiAcademyProfilesMap.get(course.academy_id)
          : null;
        // Fallback: Match with Supabase academy data if API fetch failed
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
            profile_photo_url: supabaseAcademyData.profile_photo_url,
            profile_image_url: supabaseAcademyData.profile_image_url,
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
        // Unsave: Delete from Supabase
        const { error } = await supabase
          .from("saved_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", course.id);

        if (error) {
          throw new Error(`Failed to unsave course: ${error.message}`);
        }
      } else {
        // Save: Insert into Supabase
        const { error } = await supabase
          .from("saved_courses")
          .insert({ user_id: userId, course_id: course.id });

        if (error) {
          // Handle duplicate entry (course already saved)
          if (error.code === "23505") {
            // Course is already saved, treat as success
            return;
          }
          throw new Error(`Failed to save course: ${error.message}`);
        }
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh the UI in both CoursesPage and ProfilePage
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["savedCourses"] });
      toast({
        title: variables.is_saved ? "Course Unsaved" : "Course Saved",
        description: `"${variables.title}" has been ${
          variables.is_saved ? "unsaved" : "saved"
        } successfully.`,
        duration: 1750,
      });
    },
    onError: (error) => {
      console.error("Error saving/unsaving course:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save course. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 2000,
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

  // Group courses by academy
  const coursesByAcademy = React.useMemo(() => {
    const grouped = new Map<
      string,
      { academy: AcademyProfile | null; courses: Course[] }
    >();

    filteredCourses.forEach((course) => {
      const academyId = course.academy_id || "no-academy";
      const academy = course.academy_profile_data;

      if (!grouped.has(academyId)) {
        grouped.set(academyId, {
          academy: academy || null,
          courses: [],
        });
      }

      grouped.get(academyId)!.courses.push(course);
    });

    // Sort courses within each academy by match percentage (highest first)
    grouped.forEach((group) => {
      group.courses.sort((a, b) => b.match - a.match);
    });

    return Array.from(grouped.values());
  }, [filteredCourses]);

  const renderCourseCard = (course: Course) => {
    const academyProfileName = course.academy_profile_data?.academy_name || "";
    const academyName =
      academyProfileName || course.provider || "Unknown Academy";

    return (
      <Card
        key={course.id}
        className="overflow-hidden group/card h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md bg-white"
      >
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          <img
            src={course.image ? course.image : "lovable-uploads/no_photo.png"}
            alt={course.title}
            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3">
            <Badge
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm text-gray-900 font-semibold shadow-md"
            >
              {course.match}% Match
            </Badge>
          </div>
        </div>
        <CardContent className="p-6 flex flex-col flex-1">
          <h3 className="font-semibold text-lg mb-3 line-clamp-2 text-gray-900 group-hover/card:text-primary transition-colors duration-300">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <span className="font-medium">{course.level}</span>
            <span>•</span>
            <span>{course.duration}</span>
          </div>
          <p className="text-gray-600 text-sm mb-5 line-clamp-2 flex-1">
            {course.description}
          </p>

          <div className="flex justify-between items-center gap-3 pt-4 border-t">
            <Button
              size="sm"
              variant={course.enrolled ? "outline" : "default"}
              onClick={() => {
                if (!course.enrolled) {
                  navigate(`/course/${course.id}`);
                }
              }}
              className="flex-1 font-semibold transition-all duration-300 hover:scale-105"
            >
              {course.enrolled ? "Continue" : "Enroll"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => saveCourseMutation.mutate(course)}
              aria-label={course.is_saved ? "Unsave course" : "Save course"}
              className="transition-all duration-300 hover:scale-110 hover:bg-gray-100"
            >
              <Bookmark
                className={`h-5 w-5 transition-all duration-300 ${
                  course.is_saved
                    ? "fill-primary text-primary scale-110"
                    : "text-gray-400 hover:text-primary"
                }`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Generate a fallback color based on academy name
  const getFallbackColor = (name: string, idx: number): string => {
    const colors = [
      "#E3F2FD", // Light blue
      "#E0F7FD", // Light aqua
      "#E8F5E9", // Light green
      "#FFF3E0", // Light orange
      "#FCE4EC", // Light pink
      "#E0F2F1", // Light teal
      "#FFF8E1", // Light yellow
      "#E6F2FF", // Light sky blue
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[(hash + idx) % colors.length];
  };

  // Academy Section Component
  const AcademySection: React.FC<{
    academy: AcademyProfile | null;
    academyCourses: Course[];
    index: number;
  }> = ({ academy, academyCourses, index }) => {
    const academyName =
      academy?.academy_name || academyCourses[0]?.provider || "Unknown Academy";
    const academyId = academy?.id || academyCourses[0]?.academy_id;
    const academyLogo = academy?.logo_url;
    const academyProfilePicture =
      academy?.profile_image_url || academy?.profile_photo_url;
    const imageUrl = academyProfilePicture || academyLogo;
    const hasMoreCourses = academyCourses.length > 3;
    const top3Courses = academyCourses.slice(0, 3);

    const { backgroundColor, textColor, isLoading } = useAcademyColor(imageUrl);

    // Determine which image to show (profile_image_url takes priority, then profile_photo_url, then logo)
    const displayImage = academyProfilePicture || academyLogo;

    // Debug: Log academy data
    React.useEffect(() => {
      if (process.env.NODE_ENV === "development" && academy) {
        console.log(`[Academy Section ${index}] ${academyName}:`, {
          academy_id: academyId,
          profile_image_url: academy.profile_image_url,
          profile_photo_url: academy.profile_photo_url,
          logo_url: academy.logo_url,
          hasProfileImage: !!academy.profile_image_url,
          hasProfilePhoto: !!academy.profile_photo_url,
          hasLogo: !!academyLogo,
          displayImage: displayImage,
        });
      }
    }, [academy, academyName, academyId, academyLogo, displayImage, index]);

    // Always use fallback color, but use extracted color if available
    const fallbackColor = getFallbackColor(academyName, index);
    const displayColor = backgroundColor || fallbackColor;

    // Get first letter of academy name for avatar fallback
    const academyInitial = academyName.charAt(0).toUpperCase();

    return (
      <div
        key={academyId || `no-academy-${index}`}
        className="group relative rounded-2xl p-8 md:p-10 transition-all duration-500 hover:shadow-xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, transparent 0%, ${hexToRgba(
            displayColor,
            0.15
          )} 50%, ${hexToRgba(displayColor, 0.25)} 100%)`,
          boxShadow: `0 4px 20px ${hexToRgba(
            displayColor,
            0.1
          )}, 0 1px 3px ${hexToRgba(displayColor, 0.08)}`,
          border: `1px solid ${hexToRgba(displayColor, 0.2)}`,
        }}
      >
        {/* Decorative accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
          style={{
            background: displayColor,
          }}
        />

        <div className="relative space-y-8">
          {/* Academy Header */}
          <div className="flex items-start gap-5">
            {/* Profile Picture using OptimizedAvatar (same as ProfilePage) */}
            <div className="relative flex-shrink-0">
              <OptimizedAvatar
                src={academyProfilePicture || undefined}
                alt={`${academyName} profile`}
                fallback={academyInitial}
                size="lg"
                className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-white/50 shadow-lg"
              />
              {/* Logo - Show if available and no profile picture */}
              {!academyProfilePicture && academyLogo && (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex-shrink-0 bg-white/80 backdrop-blur-sm shadow-lg ring-4 ring-white/50">
                  <img
                    src={academyLogo}
                    alt={`${academyName} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              {academyId ? (
                <Link to={`/academy/${academyId}`} className="block group/link">
                  <h2
                    className={`text-2xl md:text-3xl font-bold transition-all duration-300 cursor-pointer group-hover/link:translate-x-1 ${
                      isLoading
                        ? "text-gray-900"
                        : displayColor
                        ? isDarkColor(displayColor)
                          ? "text-white"
                          : "text-gray-900"
                        : "text-gray-900"
                    }`}
                  >
                    {academyName}
                  </h2>
                </Link>
              ) : (
                <h2
                  className={`text-2xl md:text-3xl font-bold ${
                    isLoading
                      ? "text-gray-900"
                      : displayColor
                      ? isDarkColor(displayColor)
                        ? "text-white"
                        : "text-gray-900"
                      : "text-gray-900"
                  }`}
                >
                  {academyName}
                </h2>
              )}
            </div>
          </div>

          {/* Top 3 Courses */}
          {top3Courses.length > 0 ? (
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 -mx-2 md:mx-0 px-2 md:px-0 scrollbar-hide snap-x snap-mandatory md:snap-none">
              {top3Courses.map((course) => (
                <div
                  key={course.id}
                  className="flex-shrink-0 w-[300px] md:w-auto snap-start md:flex-shrink md:snap-none"
                >
                  {renderCourseCard(course)}
                </div>
              ))}
            </div>
          ) : null}

          {/* More Courses Button */}
          {hasMoreCourses && academyId && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/academy/${academyId}`)}
                className="min-w-[200px] font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{
                  backgroundColor: hexToRgba(displayColor, 0.1),
                  borderColor: hexToRgba(displayColor, 0.3),
                  color: isDarkColor(displayColor)
                    ? displayColor
                    : `${displayColor}dd`,
                  borderWidth: "2px",
                }}
              >
                View More Courses ({academyCourses.length - 3} more)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

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

        {coursesLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading courses...</p>
          </div>
        ) : coursesByAcademy.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No courses found.</p>
          </div>
        ) : (
          <div className="space-y-10 md:space-y-12 pb-32 md:pb-16">
            {coursesByAcademy.map((group, index) => (
              <AcademySection
                key={group.academy?.id || `no-academy-${index}`}
                academy={group.academy}
                academyCourses={group.courses}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default CoursesPage;
