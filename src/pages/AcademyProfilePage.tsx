import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Edit, Settings, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface AcademyProfile {
  id: string;
  academy_name: string;
  description: string;
  website_url: string;
  contact_email: string;
  logo_url: string | null;
}

interface UserProfile {
  profile_photo_url: string | null;
}

const AcademyProfilePage = () => {
  const { user, signOut } = useAuth();
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
        const [academyResult, profileResult] = await Promise.all([
          supabase
            .from("academy_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("profiles")
            .select("profile_photo_url")
            .eq("id", user.id)
            .single(),
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
          console.error(
            "Error fetching user profile photo:",
            profileResult.error
          );
        } else {
          setUserProfile(profileResult.data);
        }
      } catch (error: any) {
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
    } catch (error: any) {
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 md:h-24 md:w-24">
                <AvatarImage
                  src={userProfile?.profile_photo_url || undefined}
                  alt={academyProfile?.academy_name}
                />
                <AvatarFallback>
                  {(academyProfile?.academy_name || user?.email || "A")
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {academyProfile?.academy_name || user?.email}
                </h1>
                <p className="text-sm md:text-base text-gray-500">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button
                variant="outline"
                size={isMobile ? "icon" : "default"}
                aria-label="Settings"
                asChild
              >
                <Link to="/settings">
                  <Settings className={isMobile ? "h-4 w-4" : "h-4 w-4 mr-2"} />
                  {!isMobile && "Settings"}
                </Link>
              </Button> */}
              <Button
                variant="outline"
                onClick={handleSignOut}
                size={isMobile ? "icon" : "default"}
                aria-label="Logout"
              >
                <LogOut className={isMobile ? "h-4 w-4" : "h-4 w-4 mr-2"} />
                {!isMobile && "Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Academy Information Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Academy Information</CardTitle>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Academy Profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your academy's information here. Click
                      save when you're done.
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
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-semibold">Description</h4>
              <p className="text-muted-foreground">
                {academyProfile?.description || "No description provided."}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Website</h4>
              <a
                href={academyProfile?.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {academyProfile?.website_url || "Not available"}
              </a>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Contact Email</h4>
              <p className="text-muted-foreground">
                {academyProfile?.contact_email || "Not available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademyProfilePage;
