<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TestResults } from '@/components/skills/TestResults';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';
=======
import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TestResults } from "@/components/skills/TestResults";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Camera, Upload } from "lucide-react";
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
<<<<<<< HEAD

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

=======
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        // Set basic info from auth
        setFullName(user.user_metadata?.full_name || "");
        setEmail(user.email || "");

        // Fetch additional profile data from profiles table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("profile_photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profile) {
          setProfilePhotoUrl(profile.profile_photo_url || "");
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Update profile in database
      const { error: updateError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        profile_photo_url: publicUrl,
      });

      if (updateError) throw updateError;

      setProfilePhotoUrl(publicUrl);
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
<<<<<<< HEAD
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: {
          full_name: fullName
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
      }
=======
      // Update auth user data
      const { error: authError } = await supabase.auth.updateUser({
        email: email,
        data: {
          full_name: fullName,
        },
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user?.id!,
        email: email,
        full_name: fullName,
        profile_photo_url: profilePhotoUrl,
      });

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
<<<<<<< HEAD
        variant: "destructive"
=======
        variant: "destructive",
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    
=======

>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
<<<<<<< HEAD
        variant: "destructive"
=======
        variant: "destructive",
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
<<<<<<< HEAD
        variant: "destructive"
=======
        variant: "destructive",
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
<<<<<<< HEAD
        password: newPassword
=======
        password: newPassword,
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
<<<<<<< HEAD
          variant: "destructive"
=======
          variant: "destructive",
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
        });
      } else {
        toast({
          title: "Success",
<<<<<<< HEAD
          description: "Password updated successfully"
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
=======
          description: "Password updated successfully",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
<<<<<<< HEAD
        variant: "destructive"
=======
        variant: "destructive",
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-2">
          <User className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        {/* Test Results Section */}
        <TestResults />

<<<<<<< HEAD
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button type="submit" disabled={passwordLoading} className="w-full">
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View your account details and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Account ID:</span>
                <span className="text-sm text-gray-600">{user?.id}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Email Verified:</span>
                <span className="text-sm text-gray-600">
                  {user?.email_confirmed_at ? 'Yes' : 'No'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Account Created:</span>
                <span className="text-sm text-gray-600">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
=======
        <div className="space-y-6">
          {/* Profile Photo and Info - Centered Design */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Profile Photo with Edit Button */}
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage
                      src={profilePhotoUrl}
                      alt="Profile photo"
                      key={profilePhotoUrl} // Force re-render when URL changes
                    />
                    <AvatarFallback className="bg-breneo-blue/10 text-breneo-blue text-2xl">
                      {fullName
                        ? fullName.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Edit Button Overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-1 right-1 bg-breneo-blue hover:bg-breneo-blue/90 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <Upload className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* User Info - Centered */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {fullName || "User Name"}
                  </h2>
                  <p className="text-gray-500">{email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={email.split("@")[0]}
                      disabled
                      className="bg-gray-50"
                      placeholder="Username (auto-generated)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Username is based on your email and cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-gray-50"
                      placeholder="Email address"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed from this page
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full"
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details and status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account ID:</span>
                  <span className="text-sm text-gray-600">{user?.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email Verified:</span>
                  <span className="text-sm text-gray-600">
                    {user?.email_confirmed_at ? "Yes" : "No"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Created:</span>
                  <span className="text-sm text-gray-600">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      </div>
    </DashboardLayout>
  );
}
