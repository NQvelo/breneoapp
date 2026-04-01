import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { toast } from "sonner";
import { AxiosError } from "axios";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  LogOut,
  Mail,
  Globe,
  Phone,
  Camera,
  Building2,
} from "lucide-react";
import {
  normalizeEmployerProfile,
  type NormalizedEmployerProfile,
} from "@/api/employer/profile";

export default function EmployerProfilePage() {
  const { user, logout, loading: authLoading, updateUser, updateEmployerDisplay } =
    useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<NormalizedEmployerProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    company_name: "",
    description: "",
    website: "",
    phone_number: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const raw = res.data as Record<string, unknown>;
      const n = normalizeEmployerProfile(raw, user.email);
      if (n) {
        setProfile(n);
        setFormState({
          company_name: n.company_name,
          description: n.description,
          website: n.website,
          phone_number: n.phone_number,
        });
        updateEmployerDisplay({
          name: n.company_name || user.first_name || user.email,
          email: n.email || user.email,
          logo_url: n.logo_url,
        });
      }
    } catch {
      toast.error("Could not load employer profile.");
    } finally {
      setLoading(false);
    }
  }, [user, updateEmployerDisplay]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!formState.company_name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (logoFile) {
        const fd = new FormData();
        fd.append("company_name", formState.company_name.trim());
        fd.append("name", formState.company_name.trim());
        fd.append("first_name", formState.company_name.trim());
        fd.append("description", formState.description.trim());
        fd.append("website", formState.website.trim());
        fd.append("phone_number", formState.phone_number.trim());
        fd.append("logo", logoFile);
        await apiClient.patch(API_ENDPOINTS.EMPLOYER.PROFILE, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiClient.patch(API_ENDPOINTS.EMPLOYER.PROFILE, {
          company_name: formState.company_name.trim(),
          name: formState.company_name.trim(),
          first_name: formState.company_name.trim(),
          description: formState.description.trim(),
          website: formState.website.trim(),
          phone_number: formState.phone_number.trim(),
        });
      }

      const refresh = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const raw = refresh.data as Record<string, unknown>;
      const n = normalizeEmployerProfile(raw, user?.email);
      if (n) {
        setProfile(n);
        setFormState({
          company_name: n.company_name,
          description: n.description,
          website: n.website,
          phone_number: n.phone_number,
        });
        updateEmployerDisplay({
          name: n.company_name || user?.email || "",
          email: n.email || user?.email || "",
          logo_url: n.logo_url,
        });
        updateUser({ first_name: n.company_name });
      }
      setLogoFile(null);
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setImageTimestamp((t) => t + 1);
      toast.success("Profile updated.");
      setIsEditing(false);
    } catch (error: unknown) {
      const ax = error as AxiosError<{ detail?: string; message?: string }>;
      const msg =
        ax.response?.data?.detail ||
        ax.response?.data?.message ||
        "Failed to update profile.";
      toast.error(String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setIsEditing(true);
  };

  const avatarDisplaySrc =
    logoPreview ||
    profile?.logo_url ||
    user?.profile_image ||
    undefined;

  const displayName =
    profile?.company_name?.trim() ||
    user?.first_name?.trim() ||
    user?.email ||
    "Company";
  const avatarFallback = displayName.charAt(0).toUpperCase() || "C";
  const websiteRaw = profile?.website?.trim() ?? "";
  const websiteHref =
    websiteRaw && !/^https?:\/\//i.test(websiteRaw)
      ? `https://${websiteRaw}`
      : websiteRaw;

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto mb-2" />
            Loading profile…
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pt-2 pb-40 md:pb-6 px-2 sm:px-6 lg:px-8 space-y-4 md:space-y-6">
        <Card className="border-0 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Company profile
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-row items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <button
                  type="button"
                  className="relative group cursor-pointer rounded-full overflow-hidden w-12 h-12 sm:w-14 sm:h-14"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <OptimizedAvatar
                    key={`emp-avatar-${imageTimestamp}`}
                    src={avatarDisplaySrc}
                    alt="Company logo"
                    fallback={avatarFallback}
                    size="lg"
                    loading="eager"
                    className="rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm hover:underline"
                >
                  <Globe className="h-4 w-4 text-gray-500" />
                  {websiteRaw.length > 40
                    ? `${websiteRaw.slice(0, 37)}…`
                    : websiteRaw.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              ) : null}
              {(profile?.email || user?.email) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {profile?.email || user?.email}
                </span>
              )}
              {(profile?.phone_number || user?.phone_number) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {profile?.phone_number || user?.phone_number}
                </span>
              )}
            </div>

            {profile?.description ? (
              <div className="mt-6 rounded-2xl border border-border/60 p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Building2 className="h-4 w-4" />
                  About
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {profile.description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit company profile</DialogTitle>
            <DialogDescription>
              Update how your company appears to candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company name</Label>
              <Input
                id="company_name"
                value={formState.company_name}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, company_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, description: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formState.website}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, website: e.target.value }))
                }
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone</Label>
              <Input
                id="phone_number"
                value={formState.phone_number}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, phone_number: e.target.value }))
                }
              />
            </div>
            {logoFile ? (
              <p className="text-xs text-muted-foreground">
                New logo selected — it will upload when you save.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
