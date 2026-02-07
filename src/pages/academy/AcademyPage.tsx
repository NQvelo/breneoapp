import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Globe,
  Phone,
  Link2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/auth/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { slugToAcademyName } from "@/utils/academyUtils";
import { supabase } from "@/integrations/supabase/client";

// Social Platform Icons as React Components
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
      clipRule="evenodd"
    />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10c5.523 0 10-4.477 10-10S17.523 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.042-3.609-3.125-3.609-.92 0-1.816.12-2.675.339 1.433.9 3.113 1.698 5.046 2.19-.745-.469-1.396-1.012-1.911-1.59 1.473-.46 3.876-1.025 6.205-.924.762 1.618.76 3.12.76 3.162 0 .078-.006.158-.018.24a8.28 8.28 0 00-2.77.782c.504-.719 1.324-2.316 1.324-3.202 0-3.17-2.617-5.742-5.847-5.742-3.23 0-5.847 2.571-5.847 5.742 0 1.764 1.062 3.289 2.65 3.99-.107.3-.253.585-.422.856a8.404 8.404 0 01-4.56-3.576C2.454 7.257 6.787 3.475 12 3.475zM8.33 4.922a7.033 7.033 0 012.066-.312c2.099 0 3.771 1.12 3.771 2.882 0 .876-1.503 2.856-4.053 3.867-.498-1.491-.947-2.883-1.167-3.83-.73-.934-1.032-1.757-.617-2.607zm-2.443 4.589c.533-.135 1.145-.268 1.836-.398.231.936.675 2.32 1.197 3.845-2.57.52-4.661 1.201-6.194 1.984a8.545 8.545 0 013.161-5.431zm.87 6.854c1.523-1.123 3.554-1.898 6.023-2.469.406 1.185.729 2.404.966 3.643a8.646 8.646 0 01-6.989-1.174zm2.71 1.822c-.28-.991-.618-1.981-1.01-2.941 2.42-.44 4.71-.155 6.343.351-.106.527-.244 1.043-.411 1.549a8.654 8.654 0 01-4.922 1.041zm3.745 1.569c.254.554.54 1.084.855 1.58-1.492-.28-2.84-.953-3.963-1.896.374-1.228.615-2.494.719-3.789 1.391.175 2.819.379 4.256.522-.138.985-.367 1.938-.867 2.583zm2.612 1.564c.6-.768 1.043-1.64 1.3-2.6 1.453-.122 2.86-.308 4.205-.555a8.52 8.52 0 01-5.505 3.155z"
      clipRule="evenodd"
    />
  </svg>
);

// Helper function to get icon component
type SocialPlatform = "github" | "linkedin" | "facebook" | "instagram";

const getSocialIcon = (platform: SocialPlatform, className?: string) => {
  const iconProps = { className: className || "h-5 w-5" };
  switch (platform) {
    case "github":
      return <GitHubIcon {...iconProps} />;
    case "linkedin":
      return <LinkedInIcon {...iconProps} />;
    case "facebook":
      return <FacebookIcon {...iconProps} />;
    case "instagram":
      return <InstagramIcon {...iconProps} />;
    default:
      return <Link2 className={className || "h-5 w-5"} />;
  }
};

// Platform display names
const platformLabels: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
};

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
}

interface AcademyProfile {
  id: string;
  user_id?: string;
  academy_name?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  phone_number?: string;
  is_verified?: boolean;
  logo_url?: string;
  profile_photo_url?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const AcademyPage = () => {
  const { academySlug } = useParams<{ academySlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine if the parameter is an academy_id (UUID or number) or a slug
  const isNumericId = academySlug ? /^\d+$/.test(academySlug) : false;
  const isAcademyId = academySlug ? isUUID(academySlug) || isNumericId : false;
  const academyId = isAcademyId ? academySlug : null;
  const slug = !isAcademyId ? academySlug : null;

  // Helper function to normalize API response to AcademyProfile
  const normalizeAcademyProfile = (data: any): AcademyProfile => {
    if (!data) return { id: "" };

    // Handle different possible field names from API
    const getStringField = (fields: string[]) => {
      for (const field of fields) {
        const value = data[field];
        if (value !== null && value !== undefined) {
          if (typeof value === "string" && value.trim()) {
            return value;
          }
          if (typeof value === "number") {
            return String(value);
          }
        }
      }
      return undefined;
    };

    // Handle ID - can be number or string
    const getId = () => {
      if (data.id !== null && data.id !== undefined) {
        return String(data.id);
      }
      if (data.academy_id !== null && data.academy_id !== undefined) {
        return String(data.academy_id);
      }
      return "";
    };

    return {
      id: getId(),
      user_id: data.user_id,
      academy_name:
        getStringField([
          "academy_name",
          "name",
          "academyName",
          "first_name",
          "firstName",
        ]) || undefined,
      description: getStringField(["description", "desc"]) || undefined,
      website_url:
        getStringField(["website_url", "website", "websiteUrl", "url"]) ||
        undefined,
      contact_email:
        getStringField([
          "contact_email",
          "email",
          "contactEmail",
          "contact_mail",
        ]) || undefined,
      phone_number:
        getStringField(["phone_number", "phone", "phoneNumber"]) || undefined,
      is_verified:
        data.is_verified || data.isVerified || data.verified || false,
      logo_url:
        getStringField([
          "logo_url",
          "logoUrl",
          "logo",
          "profile_image_url",
          "profileImageUrl",
          "profile_photo_url",
          "profilePhotoUrl",
          "image",
        ]) || undefined,
      profile_photo_url:
        getStringField([
          "profile_image_url",
          "profileImageUrl",
          "profile_photo_url",
          "profilePhotoUrl",
          "profile_photo",
          "profilePhoto",
          "image",
          "logo_url",
          "logoUrl",
          "logo",
        ]) || undefined,
      social_links: data.social_links || undefined,
    };
  };

  const {
    data: academyProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["academy-profile", academyId || slug],
    queryFn: async () => {
      if (!academySlug) return null;

      let apiData: any = null;
      let targetAcademyId: string | null = null;

      try {
        let response;
        if (isAcademyId && academyId) {
          // Use academy_id endpoint: /api/academy/<int:academy_id>/
          targetAcademyId = academyId;
          response = await apiClient.get(`/api/academy/${academyId}/`);
          console.log("✅ Academy profile fetched by ID:", {
            academyId: academyId,
            rawData: response.data,
            hasProfileData: !!response.data?.profile_data,
          });

          // Check if response has profile_data field
          if (response.data?.profile_data) {
            apiData = response.data.profile_data;
            console.log("📦 Using profile_data from response:", apiData);
          } else {
            apiData = response.data;
          }
        } else if (slug) {
          // Try the endpoint with singular "academy" using slug
          response = await apiClient.get(`/api/academy/${slug}/`);
          console.log("✅ Academy profile fetched by slug:", {
            academySlug: slug,
            rawData: response.data,
            hasProfileData: !!response.data?.profile_data,
          });

          // Check if response has profile_data field
          if (response.data?.profile_data) {
            apiData = response.data.profile_data;
            console.log("📦 Using profile_data from response:", apiData);
          } else {
            apiData = response.data;
          }

          // Extract ID from API response if available (can be number)
          if (apiData?.id !== null && apiData?.id !== undefined) {
            targetAcademyId = String(apiData.id);
          } else if (apiData?.academy_id) {
            targetAcademyId = String(apiData.academy_id);
          }
        } else {
          return null;
        }
      } catch (err: unknown) {
        // If singular fails and it's a slug, try plural "academies"
        if (slug) {
          try {
            const response = await apiClient.get(`/api/academies/${slug}/`);
            console.log("✅ Academy profile fetched (plural endpoint):", {
              academySlug: slug,
              rawData: response.data,
              hasProfileData: !!response.data?.profile_data,
            });

            // Check if response has profile_data field
            if (response.data?.profile_data) {
              apiData = response.data.profile_data;
            } else {
              apiData = response.data;
            }

            if (apiData?.id !== null && apiData?.id !== undefined) {
              targetAcademyId = String(apiData.id);
            } else if (apiData?.academy_id) {
              targetAcademyId = String(apiData.academy_id);
            }
          } catch (error: unknown) {
            console.error("❌ Error fetching academy profile:", {
              singularError: err,
              pluralError: error,
              academySlug: slug,
              endpointsTried: [
                `/api/academy/${slug}/`,
                `/api/academies/${slug}/`,
              ],
            });
            // Continue to try Supabase as fallback
          }
        } else {
          console.error("❌ Error fetching academy profile by ID:", {
            error: err,
            academyId: academyId,
            endpoint: `/api/academy/${academyId}/`,
          });
          // Continue to try Supabase as fallback
        }
      }

      // Normalize API data
      const normalizedApi = apiData ? normalizeAcademyProfile(apiData) : null;

      // Fetch from Supabase as fallback or to supplement missing data
      let supabaseData: any = null;
      if (targetAcademyId || normalizedApi?.id) {
        const fetchId = targetAcademyId || normalizedApi?.id;
        try {
          const { data, error } = await supabase
            .from("academy_profiles")
            .select(
              "id, academy_name, description, website_url, contact_email, logo_url, is_verified, user_id",
            )
            .eq("id", fetchId)
            .single();

          if (error) {
            console.warn(
              "⚠️ Error fetching academy profile from Supabase:",
              error,
            );
          } else if (data) {
            supabaseData = data;
            console.log(
              "✅ Academy profile fetched from Supabase:",
              supabaseData,
            );
          }
        } catch (supabaseError) {
          console.warn("⚠️ Error fetching from Supabase:", supabaseError);
        }
      }

      // Check if we have any data at all
      if (!normalizedApi && !supabaseData) {
        // If we have an error from API and no Supabase data, throw an error
        if (apiData === null && !targetAcademyId) {
          throw new Error("Academy not found");
        }
      }

      // Merge data: prioritize API data, but use Supabase as fallback
      const merged: AcademyProfile = {
        id: normalizedApi?.id || supabaseData?.id || targetAcademyId || "",
        user_id: normalizedApi?.user_id || supabaseData?.user_id,
        academy_name:
          normalizedApi?.academy_name ||
          supabaseData?.academy_name ||
          undefined,
        description:
          normalizedApi?.description || supabaseData?.description || undefined,
        website_url:
          normalizedApi?.website_url || supabaseData?.website_url || undefined,
        contact_email:
          normalizedApi?.contact_email ||
          supabaseData?.contact_email ||
          undefined,
        phone_number: normalizedApi?.phone_number || undefined,
        is_verified:
          normalizedApi?.is_verified ?? supabaseData?.is_verified ?? false,
        logo_url:
          normalizedApi?.logo_url ||
          normalizedApi?.profile_photo_url ||
          supabaseData?.logo_url ||
          undefined,
        profile_photo_url:
          normalizedApi?.profile_photo_url ||
          normalizedApi?.logo_url ||
          supabaseData?.logo_url ||
          undefined,
        social_links: normalizedApi?.social_links || undefined,
      };

      // If we don't have a name or ID, it means academy was not found
      if (!merged.academy_name && !merged.id) {
        throw new Error("Academy not found");
      }

      console.log("📋 Merged academy profile:", merged);
      return merged;
    },
    enabled: !!academySlug,
    retry: 1, // Only retry once
  });

  const {
    data: courses,
    isLoading: coursesLoading,
    error: coursesError,
  } = useQuery({
    queryKey: ["academy-courses", academyProfile?.id, academyId || slug],
    queryFn: async () => {
      // Always fetch courses from Supabase using academy_id
      const targetAcademyId = academyProfile?.id || academyId;

      if (!targetAcademyId) {
        console.warn("⚠️ No academy ID available to fetch courses");
        return [];
      }

      try {
        // Fetch courses from Supabase filtered by academy_id
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("academy_id", targetAcademyId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Error fetching courses from Supabase:", error);
          throw error;
        }

        console.log("✅ Academy courses fetched from Supabase:", {
          academyId: targetAcademyId,
          courseCount: data?.length || 0,
        });

        return Array.isArray(data)
          ? data.map((course: Course) => ({
              ...course,
              topics: course.topics || [],
              required_skills: course.required_skills || [],
            }))
          : [];
      } catch (error) {
        console.error("❌ Error fetching courses from Supabase:", error);
        return [];
      }
    },
    enabled: !!(academyProfile?.id || academyId),
    retry: 1,
  });

  if (!academySlug) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-red-500">Academy ID or slug is required</p>
          <Link to="/courses">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const academyDisplayName =
    academyProfile?.academy_name ||
    (slug ? slugToAcademyName(slug) : "Loading Academy...");

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Profile Summary */}
        {profileLoading ? (
          <>
            <div className="lg:col-span-2 space-y-6">
              <div className="animate-pulse space-y-6">
                <div className="h-10 w-64 bg-gray-200 rounded"></div>
                <Card>
                  <CardHeader>
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-200 rounded-3xl mb-6"></div>
                    <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : academyProfile ? (
          <>
            {/* Left Column - Profile Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Header Card */}
              <Card>
                <CardContent className="flex flex-col items-center pb-6 pt-6">
                  <div className="relative">
                    <OptimizedAvatar
                      src={
                        academyProfile.profile_photo_url ||
                        academyProfile.logo_url ||
                        undefined
                      }
                      alt={academyProfile.academy_name || "Academy"}
                      fallback={
                        academyProfile.academy_name
                          ? academyProfile.academy_name.charAt(0).toUpperCase()
                          : "A"
                      }
                      size="xl"
                      loading="lazy"
                      className="h-32 w-32"
                    />
                  </div>
                  {academyProfile.academy_name && (
                    <h1 className="text-2xl font-bold mt-4 text-center">
                      {academyProfile.academy_name}
                    </h1>
                  )}
                  {academyProfile.is_verified && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 mt-2">
                      Verified
                    </Badge>
                  )}
                  {/* Total Courses */}
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {courses?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Total courses
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ACADEMY Badge */}
              <Card>
                <CardContent className="p-4 text-center">
                  <Badge
                    variant="outline"
                    className="text-xs uppercase tracking-wider"
                  >
                    ACADEMY
                  </Badge>
                </CardContent>
              </Card>

              {/* Contact Information Card */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-bold">Contact Information</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {academyProfile.phone_number && (
                    <div className="flex items-center gap-3">
                      <div className="bg-breneo-blue/10 rounded-full p-2">
                        <Phone size={18} className="text-breneo-blue" />
                      </div>
                      <span className="text-sm">
                        {academyProfile.phone_number}
                      </span>
                    </div>
                  )}
                  {academyProfile.contact_email && (
                    <div className="flex items-center gap-3">
                      <div className="bg-breneo-blue/10 rounded-full p-2">
                        <Mail size={18} className="text-breneo-blue" />
                      </div>
                      <span className="text-sm">
                        {academyProfile.contact_email}
                      </span>
                    </div>
                  )}
                  {academyProfile.website_url && (
                    <div className="flex items-center gap-3">
                      <div className="bg-breneo-blue/10 rounded-full p-2">
                        <Globe size={18} className="text-breneo-blue" />
                      </div>
                      <a
                        href={academyProfile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-breneo-blue hover:underline flex items-center gap-1"
                      >
                        {academyProfile.website_url}
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Networks Card */}
              {academyProfile.social_links &&
                (academyProfile.social_links.github ||
                  academyProfile.social_links.linkedin ||
                  academyProfile.social_links.facebook ||
                  academyProfile.social_links.instagram) && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-bold">Social Networks</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(academyProfile.social_links)
                          .filter(([_, url]) => url && url.trim() !== "")
                          .map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 flex-1 hover:text-breneo-blue transition-colors"
                            >
                              <div className="bg-breneo-blue/10 rounded-full p-2">
                                {getSocialIcon(
                                  platform as SocialPlatform,
                                  "h-[18px] w-[18px] text-breneo-blue",
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {platformLabels[platform as SocialPlatform]}
                                </p>
                              </div>
                              <ExternalLink
                                size={14}
                                className="text-gray-400"
                              />
                            </a>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="mb-4">
                <Link to="/courses">
                  <Button
                    variant="ghost"
                    className="text-breneo-blue hover:text-breneo-blue/80 mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Courses
                  </Button>
                </Link>
              </div>

              {/* About Section */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">About me</h2>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    {academyProfile.description ? (
                      <p>{academyProfile.description}</p>
                    ) : (
                      <p className="text-gray-400 italic">
                        No description available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Courses Section */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">
                    My courses ({courses?.length || 0})
                  </h2>
                </CardHeader>
                <CardContent>
                  {coursesLoading ? (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading courses...</div>
                    </div>
                  ) : courses && courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {courses.map((course) => (
                        <Card key={course.id} className="overflow-hidden">
                          <div className="h-40 overflow-hidden">
                            <img
                              src={
                                course.image
                                  ? course.image
                                  : "/lovable-uploads/no_photo.png"
                              }
                              alt={course.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite loop - only set fallback if not already set
                                if (
                                  !target.src.includes(
                                    "/lovable-uploads/no_photo.png",
                                  )
                                ) {
                                  target.onerror = null; // Remove error handler to prevent loop
                                  target.src = "/lovable-uploads/no_photo.png";
                                }
                              }}
                            />
                          </div>
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-lg">
                                {course.title}
                              </h3>
                              {course.popular && (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                >
                                  Popular
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                              <span>{course.level}</span>
                              <span>•</span>
                              <span>{course.duration}</span>
                              <span>•</span>
                              <span>{course.category}</span>
                            </div>

                            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                              {course.description}
                            </p>

                            <div className="mb-4">
                              <div className="flex flex-wrap gap-2">
                                {course.topics
                                  .slice(0, 3)
                                  .map((topic, index) => (
                                    <span
                                      key={index}
                                      className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                {course.topics.length > 3 && (
                                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                    +{course.topics.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex flex-wrap gap-1">
                                {course.required_skills
                                  .slice(0, 2)
                                  .map((skill, index) => (
                                    <span
                                      key={index}
                                      className="bg-breneo-blue/10 text-breneo-blue text-xs px-2 py-1 rounded"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                {course.required_skills.length > 2 && (
                                  <span className="bg-breneo-blue/10 text-breneo-blue text-xs px-2 py-1 rounded">
                                    +{course.required_skills.length - 2}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant={
                                  course.enrolled ? "outline" : "default"
                                }
                                className={
                                  course.enrolled
                                    ? ""
                                    : "bg-breneo-blue hover:bg-breneo-blue/90"
                                }
                                onClick={() => {
                                  if (!course.enrolled) {
                                    navigate(`/course/${course.id}`);
                                  }
                                }}
                              >
                                {course.enrolled ? "Continue" : "Enroll"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border">
                      <p className="text-gray-500 mb-4">
                        No courses found for {academyDisplayName}
                      </p>
                      <Link to="/courses">
                        <Button variant="outline">Browse All Courses</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : profileError || !academyProfile ? (
          <div className="lg:col-span-3">
            <Card className="border-red-200">
              <CardContent className="p-6 text-center">
                <div className="max-w-md mx-auto">
                  <h1 className="text-2xl sm:text-3xl font-bold text-breneo-navy mb-4">
                    Academy Not Found
                  </h1>
                  <p className="text-red-600 mb-4 text-lg">
                    Cannot find an academy
                  </p>
                  <p className="text-gray-600 text-sm mb-4">
                    {profileError instanceof Error
                      ? profileError.message === "Academy not found" ||
                        profileError.message.includes("not found") ||
                        profileError.message.includes("404")
                        ? "The academy you're looking for doesn't exist or has been removed."
                        : `Error: ${profileError.message}`
                      : "The academy you're looking for doesn't exist or has been removed."}
                  </p>
                  {academySlug && (
                    <p className="text-gray-500 text-xs mb-6">
                      {isAcademyId
                        ? `Academy ID: ${academyId}`
                        : `Academy Slug: ${slug}`}
                    </p>
                  )}
                  <Link to="/courses">
                    <Button variant="default">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Courses
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default AcademyPage;
