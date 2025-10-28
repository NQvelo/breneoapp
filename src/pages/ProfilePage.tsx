import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { LogOut, Edit, Phone, Mail, Plus, Settings, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SkillTestResult {
  final_role?: string;
  skills_json?: {
    tech?: Record<string, string>;
    soft?: Record<string, string>;
  };
}

const ProfilePage = () => {
  // ✅ Get user, loading state, and logout function from AuthContext
  const { user, loading, logout } = useAuth();
  const isMobile = useMobile();
  const navigate = useNavigate();

  // State for skill test results
  const [skillResults, setSkillResults] = useState<SkillTestResult | null>(
    null
  );
  const [loadingResults, setLoadingResults] = useState(false);

  // Fetch skill test results
  useEffect(() => {
    const fetchSkillResults = async () => {
      if (!user) return;

      setLoadingResults(true);
      try {
        // Pass user ID as query parameter to fetch user-specific results
        const response = await apiClient.get(
          `/api/skilltest/results/?user=${user.id}`
        );

        console.log("🔍 Skill test results response:", response.data);
        console.log("🔍 Response type:", typeof response.data);
        console.log("🔍 Is array?", Array.isArray(response.data));

        // Handle different response structures
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log("✅ Got array with length:", response.data.length);
          setSkillResults(response.data[0]);
        } else if (response.data && typeof response.data === "object") {
          console.log("✅ Got object response");
          setSkillResults(response.data);
        } else {
          console.log("⚠️ Unexpected response structure");
        }
      } catch (error) {
        console.error("❌ Error fetching skill test results:", error);
        setSkillResults(null);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchSkillResults();
  }, [user]);

  // Debug: Log skillResults changes
  useEffect(() => {
    if (skillResults) {
      console.log("✅ SkillResults updated:", skillResults);
      console.log("✅ Final role:", skillResults.final_role);
      console.log("✅ Skills JSON:", skillResults.skills_json);
    }
  }, [skillResults]);

  // ✅ Show loading text based on the context's loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  // ✅ Show error or prompt to login if user isn't loaded
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Could not load user data. Please try logging in again.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleLogout = () => {
    // ✅ Call the logout function directly from the context
    logout();
  };

  // ✅ Use the 'user' object from the context directly
  const { first_name, last_name, email, phone_number, profile_image } = user;

  // Combine all skills from tech and soft - only show top 5 with > 0%
  const getAllSkills = () => {
    if (!skillResults?.skills_json) {
      console.log("⚠️ No skills_json in results");
      return [];
    }

    const tech = skillResults.skills_json.tech || {};
    const soft = skillResults.skills_json.soft || {};

    console.log("🔍 Tech skills:", tech);
    console.log("🔍 Soft skills:", soft);

    // Combine both and convert to array
    const allSkills = [
      ...Object.entries(tech).map(([skill, percentage]) => ({
        name: skill,
        percentage: parseFloat(String(percentage).replace("%", "")),
        type: "tech",
      })),
      ...Object.entries(soft).map(([skill, percentage]) => ({
        name: skill,
        percentage: parseFloat(String(percentage).replace("%", "")),
        type: "soft",
      })),
    ];

    console.log("🔍 All skills before filtering:", allSkills);

    // Filter skills > 0%, sort by percentage descending, and limit to top 5
    const filtered = allSkills
      .filter((skill) => skill.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    console.log("🔍 Top 5 skills:", filtered);

    return filtered;
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="flex flex-col items-center pb-6 pt-6">
              <OptimizedAvatar
                src={profile_image}
                alt="Profile photo"
                fallback={first_name ? first_name.charAt(0).toUpperCase() : "U"}
                size="xl"
                loading="lazy"
                className="h-32 w-32"
              />
              <h1 className="text-2xl font-bold mt-4 text-center">
                {first_name} {last_name}
              </h1>
              <div className="mt-4 flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-[4] flex items-center justify-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex-[1] flex items-center justify-center border-breneo-danger text-breneo-danger hover:bg-breneo-danger/10"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold">Contact Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Phone size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">
                  {phone_number || "Not provided"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Mail size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">{email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Social Networks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Social Networks</h3>
              <Button variant="link" className="text-breneo-blue p-0 h-auto">
                Add
              </Button>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Me Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">About Me</h3>
              <Button variant="link" className="text-breneo-blue p-0 h-auto">
                Edit
              </Button>
            </CardHeader>
          </Card>

          {/* Work Experience Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Work Experience</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
          </Card> */}

          {/* Education Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Education</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-base">Management and IT</p>
                <p className="text-sm text-gray-600">Master</p>
                <p className="text-sm text-gray-500">University</p>
              </div>
            </CardContent>
          </Card> */}

          {/* Professional Skills Card */}
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Professional Skills</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </Button>
            </CardHeader>
          </Card> */}

          {/* Personal Skills Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Personal Skills</h3>
            </CardHeader>
            <CardContent>
              {loadingResults ? (
                <div className="text-center py-4 text-gray-500">
                  Loading skill results...
                </div>
              ) : skillResults &&
                (skillResults.final_role || getAllSkills().length > 0) ? (
                <div className="space-y-4">
                  {/* Final Role */}
                  {skillResults.final_role && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          Recommended Role
                        </span>
                      </div>
                      <Badge className="text-base px-4 py-2 bg-blue-600 hover:bg-blue-700">
                        {skillResults.final_role}
                      </Badge>
                    </div>
                  )}

                  {/* Skills List - Top 5 */}
                  {getAllSkills().length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Top Skills
                      </h4>
                      {getAllSkills().map((skill) => {
                        const isStrong = skill.percentage >= 70;
                        return (
                          <div key={skill.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">
                                {skill.name}
                              </span>
                              <span
                                className={`font-semibold ${
                                  isStrong
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-orange-600 dark:text-orange-400"
                                }`}
                              >
                                {skill.percentage.toFixed(0)}%
                              </span>
                            </div>
                            <Progress
                              value={skill.percentage}
                              className={`h-2 ${
                                isStrong
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-orange-100 dark:bg-orange-900/30"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {getAllSkills().length === 0 && !loadingResults && (
                    <div className="text-center py-4 text-gray-500">
                      No skill test results available. Take a skill test to see
                      your results here.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No skill test results available. Take a skill test to see your
                  results here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
