import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Settings, LogOut, Mail, Globe, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
}

interface UserProfile {
  profile_image?: string | null;
  about_me?: string | null;
  created_at?: string | null;
  email?: string | null;
  full_name?: string | null;
  id?: string;
  interests?: string[] | null;
  onboarding_completed?: boolean | null;
  updated_at?: string | null;
}

const AcademyProfilePage = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    academy_name: "",
    description: "",
    website_url: "",
    contact_email: "",
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userId = String(user.id);
        const [academyResult, profileResult] = await Promise.all([
          supabase
            .from("academy_profiles")
            .select("*")
            .eq("user_id", userId)
            .single(),
          supabase.from("profiles").select("*").eq("id", userId).single(),
        ]);

        if (academyResult.error) throw academyResult.error;
        if (academyResult.data) {
          setAcademyProfile(academyResult.data);
          setFormState({
            academy_name: academyResult.data.academy_name || "",
            description: academyResult.data.description || "",
            website_url: academyResult.data.website_url || "",
            contact_email: academyResult.data.contact_email || "",
          });
        }

        if (profileResult.error) {
          console.error("Error fetching user profile:", profileResult.error);
        } else if (profileResult.data) {
          setUserProfile(profileResult.data);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast({
          title: "Error fetching profile",
          description: "Could not load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, toast]);

  const handleUpdateProfile = async () => {
    if (!user || !academyProfile) return;

    try {
      const { error } = await supabase
        .from("academy_profiles")
        .update({
          academy_name: formState.academy_name,
          description: formState.description,
          website_url: formState.website_url,
          contact_email: formState.contact_email,
        })
        .eq("id", academyProfile.id);

      if (error) throw error;

      setAcademyProfile((prev) => (prev ? { ...prev, ...formState } : null));
      toast({
        title: "Success",
        description: "Your academy profile has been updated.",
      });
      setIsEditing(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormState((prev) => ({ ...prev, [id]: value }));
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="flex flex-col items-center pb-6 pt-6">
              <OptimizedAvatar
                src={
                  user?.profile_image || userProfile?.profile_image || undefined
                }
                alt={academyProfile?.academy_name || "Academy"}
                fallback={(
                  academyProfile?.academy_name ||
                  (user?.name as string | undefined) ||
                  user?.email ||
                  "A"
                )
                  .charAt(0)
                  .toUpperCase()}
                size="xl"
                loading="lazy"
                className="h-32 w-32"
              />
              {(user?.name as string) && (
                <h1 className="text-2xl font-bold mt-4 text-center">
                  {user?.name as string}
                </h1>
              )}
              {academyProfile?.academy_name && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2 text-center">
                  {academyProfile.academy_name}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-[4] flex items-center justify-center gap-2"
                  onClick={() => navigate("/academy/settings")}
                >
                  <Settings size={16} />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
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
              {user?.phone_number && (
                <div className="flex items-center gap-3">
                  <div className="bg-breneo-blue/10 rounded-full p-2">
                    <Phone size={18} className="text-breneo-blue" />
                  </div>
                  <span className="text-sm">{user.phone_number}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-breneo-blue/10 rounded-full p-2">
                  <Mail size={18} className="text-breneo-blue" />
                </div>
                <span className="text-sm">{user?.email || "Not provided"}</span>
              </div>
              {academyProfile?.contact_email && (
                <div className="flex items-center gap-3">
                  <div className="bg-breneo-blue/10 rounded-full p-2">
                    <Mail size={18} className="text-breneo-blue" />
                  </div>
                  <span className="text-sm">
                    {academyProfile.contact_email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academy Website Card */}
          {academyProfile?.website_url && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold">Website</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="bg-breneo-blue/10 rounded-full p-2">
                    <Globe size={18} className="text-breneo-blue" />
                  </div>
                  <a
                    href={academyProfile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-breneo-blue hover:underline text-sm truncate"
                  >
                    {academyProfile.website_url}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academy Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-bold">Academy Information</h3>
              <Button
                variant="link"
                className="text-breneo-blue p-0 h-auto"
                onClick={() => setIsEditing(true)}
              >
                <Edit size={16} className="mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-semibold">Description</h4>
                <p className="text-gray-700 dark:text-gray-300">
                  {academyProfile?.description || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Academy Profile</DialogTitle>
              <DialogDescription>
                Make changes to your academy's information here. Click save when
                you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="academy_name" className="text-right">
                  Academy Name
                </Label>
                <Input
                  id="academy_name"
                  value={formState.academy_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="website_url" className="text-right">
                  Website URL
                </Label>
                <Input
                  id="website_url"
                  value={formState.website_url}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact_email" className="text-right">
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formState.contact_email}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AcademyProfilePage;
