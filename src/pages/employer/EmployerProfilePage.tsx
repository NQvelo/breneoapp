import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { TokenManager } from "@/api/auth/tokenManager";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndustryMultiSelect } from "@/components/employer/IndustryMultiSelect";
import { EmployerCompanySearchField } from "@/components/employer/EmployerCompanySearchField";
import {
  Edit,
  LogOut,
  Mail,
  Globe,
  Phone,
  Camera,
  Building2,
  User,
  Briefcase,
} from "lucide-react";
import {
  extractBreneoEmailFromJwt,
  extractBreneoUserIdFromEmployerProfileRaw,
  extractBreneoUserIdFromJwt,
  extractEmailFromEmployerProfileRaw,
  normalizeEmployerProfile,
  type NormalizedEmployerProfile,
} from "@/api/employer/profile";
import {
  buildAggregatorCompanyCreatePayload,
  createEmployerDirectoryCompanyQuick,
  fetchAggregatorIndustries,
  fetchEmployerAggregatorCompanies,
  joinOrCreateEmployerAggregatorCompany,
  type AggregatorCompany,
  type AggregatorIndustry,
} from "@/api/employer/aggregatorBffApi";

const EMP_AGG_EMPLOYEE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export default function EmployerProfilePage() {
  const {
    user,
    logout,
    loading: authLoading,
    updateUser,
    updateEmployerDisplay,
  } = useAuth();
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
  const [aggregatorCompanies, setAggregatorCompanies] = useState<
    AggregatorCompany[]
  >([]);
  const [aggregatorLoading, setAggregatorLoading] = useState(false);
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<AggregatorCompany | null>(
    null,
  );
  const [pickerName, setPickerName] = useState("");
  const [pickerDomain, setPickerDomain] = useState("");
  const [pickerLogoUrl, setPickerLogoUrl] = useState("");
  const [pickerDescription, setPickerDescription] = useState("");
  const [pickerEmployees, setPickerEmployees] = useState<string>("51-200");
  const [pickerIndustryIds, setPickerIndustryIds] = useState<number[]>([]);
  const [industryCatalog, setIndustryCatalog] = useState<AggregatorIndustry[]>(
    [],
  );

  useEffect(() => {
    fetchAggregatorIndustries()
      .then(setIndustryCatalog)
      .catch(() => setIndustryCatalog([]));
  }, []);

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
          name: n.company_name?.trim() || user.email,
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

  const loadAggregatorCompanies = useCallback(async () => {
    if (!user) return;
    setAggregatorLoading(true);
    try {
      const prof = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const staffId =
        extractBreneoUserIdFromEmployerProfileRaw(prof.data) || String(user.id);
      const list = await fetchEmployerAggregatorCompanies(staffId);
      setAggregatorCompanies(list);
    } catch {
      setAggregatorCompanies([]);
    } finally {
      setAggregatorLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAggregatorCompanies();
  }, [loadAggregatorCompanies]);

  useEffect(() => {
    if (!companyPickerOpen || !profile) return;
    setPickerSelected(null);
    setPickerName(profile.company_name?.trim() || "");
    setPickerDomain("");
    setPickerLogoUrl(profile.logo_url?.trim() || "");
    setPickerDescription(profile.description || "");
    setPickerEmployees(profile.number_of_employees || "51-200");
    setPickerIndustryIds(profile.industry_ids ?? []);
  }, [companyPickerOpen, profile]);

  const handleQuickCreateDirectoryCompany = useCallback(
    async (name: string): Promise<AggregatorCompany> => {
      const trim = name.trim();
      if (!trim) {
        throw new Error("Company name is required.");
      }
      if (!user) {
        toast.error("You must be signed in.");
        throw new Error("Not signed in");
      }
      if (!industryCatalog.length) {
        toast.error("Industries are still loading. Try again in a moment.");
        throw new Error("Industries not loaded");
      }
      const token = TokenManager.getAccessToken();
      let profRes;
      try {
        profRes = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      } catch {
        toast.error("Could not load your employer profile.");
        throw new Error("Profile fetch failed");
      }
      const rawProf = profRes.data as Record<string, unknown>;
      const email =
        user.email?.trim() ||
        (token ? extractBreneoEmailFromJwt(token) : "") ||
        extractEmailFromEmployerProfileRaw(rawProf);
      if (!email?.trim()) {
        toast.error("No email on file. Add an email to your profile first.");
        throw new Error("No email");
      }
      const breneoUserId =
        extractBreneoUserIdFromEmployerProfileRaw(rawProf) ||
        (token ? extractBreneoUserIdFromJwt(token) : null);
      if (!breneoUserId) {
        toast.error("Could not resolve your user id.");
        throw new Error("No user id");
      }
      try {
        const created = await createEmployerDirectoryCompanyQuick({
          name: trim,
          companyEmail: email.trim().toLowerCase(),
          breneoUserId,
          domain: pickerDomain.trim() || undefined,
          industriesCatalog: industryCatalog,
        });
        toast.success("Company added to the job directory.");
        return created;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not create company.";
        toast.error(msg);
        throw e;
      }
    },
    [user, industryCatalog, pickerDomain],
  );

  const handleCompanyDirectorySubmit = async () => {
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    const token = TokenManager.getAccessToken();
    let profRes;
    try {
      profRes = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
    } catch {
      toast.error(
        "Could not load your employer profile. Open the profile page once or try again.",
      );
      return;
    }
    const rawProf = profRes.data as Record<string, unknown>;
    const effectiveProfile =
      normalizeEmployerProfile(rawProf, user.email) ?? profile;
    if (!effectiveProfile) {
      toast.error("Missing profile or email.");
      return;
    }

    const email =
      user.email?.trim() ||
      effectiveProfile.email?.trim() ||
      (token ? extractBreneoEmailFromJwt(token) : "") ||
      extractEmailFromEmployerProfileRaw(rawProf);
    if (!email?.trim()) {
      toast.error(
        "No email found for your account. Set an email on your Breneo profile, then try again.",
      );
      return;
    }

    const breneoUserId =
      extractBreneoUserIdFromEmployerProfileRaw(rawProf) ||
      (token ? extractBreneoUserIdFromJwt(token) : null);
    if (!breneoUserId) {
      toast.error("Could not resolve your user id for the job directory.");
      return;
    }

    const breneoCompanyName = pickerSelected
      ? String(pickerSelected.name ?? "").trim() || pickerName.trim()
      : pickerName.trim();
    if (!breneoCompanyName.trim() || !pickerDescription.trim()) {
      toast.error("Company name and description are required.");
      return;
    }
    if (pickerSelected) {
      const cid = pickerSelected.id;
      if (cid == null || String(cid).trim() === "") {
        toast.error("This company cannot be linked. Create a new one instead.");
        return;
      }
    }

    const emailNorm = email.trim().toLowerCase();
    const domainFromEmail = emailNorm.includes("@")
      ? emailNorm.slice(emailNorm.indexOf("@") + 1).trim().toLowerCase()
      : "";

    const industryNamesBySelectionOrder = pickerIndustryIds.map(
      (id) => industryCatalog.find((i) => i.id === id)?.name ?? "",
    );

    setPickerSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.EMPLOYER.PROFILE, {
        company_name: breneoCompanyName.trim(),
        name: breneoCompanyName.trim(),
        description: pickerDescription.trim(),
        website: effectiveProfile.website?.trim() || "",
        phone_number: effectiveProfile.phone_number?.trim() || "",
        industries: pickerIndustryIds,
        industry_names: industryNamesBySelectionOrder,
        number_of_employees: pickerEmployees,
        locations: effectiveProfile.locations || [],
      });

      if (pickerSelected?.id != null) {
        await joinOrCreateEmployerAggregatorCompany({
          breneoUserId,
          mode: "existing",
          existingCompanyId: String(pickerSelected.id),
          existingCompanyName: String(pickerSelected.name ?? ""),
        });
      } else {
        const payload = buildAggregatorCompanyCreatePayload({
          name: pickerName.trim(),
          companyEmail: emailNorm,
          domain: pickerDomain.trim() || domainFromEmail,
          description: pickerDescription.trim(),
          website: effectiveProfile.website?.trim() || "",
          logoUrl: pickerLogoUrl.trim() || undefined,
          employeesCount: pickerEmployees,
          selectedIndustryIds: pickerIndustryIds,
          industriesCatalog: industryCatalog,
          industryNamesBySelectionOrder,
        });
        await joinOrCreateEmployerAggregatorCompany({
          breneoUserId,
          mode: "new",
          createPayload: payload,
        });
      }

      toast.success(
        pickerSelected
          ? "Linked to the company on the job directory."
          : "Company added to the job directory.",
      );
      setCompanyPickerOpen(false);
      await fetchProfile();
      await loadAggregatorCompanies();
    } catch (e: unknown) {
      const ax = e as Error;
      toast.error(ax.message || "Could not save the job directory company.");
    } finally {
      setPickerSaving(false);
    }
  };

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

  const personDisplayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Employer";
  const displayName =
    profile?.company_name?.trim() ||
    user?.first_name?.trim() ||
    user?.email ||
    "Company";
  const avatarFallback = displayName.charAt(0).toUpperCase() || "C";
  const personAvatarFallback =
    personDisplayName.charAt(0).toUpperCase() || "U";
  const primaryAggregatorCompany: AggregatorCompany | undefined =
    aggregatorCompanies[0];
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
              Your account
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
                aria-label="Edit company profile"
              >
                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-row items-start gap-4">
              <div className="flex-shrink-0">
                <OptimizedAvatar
                  src={user?.profile_image ?? undefined}
                  alt="Profile"
                  fallback={personAvatarFallback}
                  size="lg"
                  loading="eager"
                  className="rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Signed in as
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {personDisplayName}
                </h1>
                {user?.email ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {user.email}
                  </span>
                ) : null}
                {(profile?.phone_number || user?.phone_number) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {profile?.phone_number || user?.phone_number}
                  </span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 rounded-3xl">
          <CardHeader className="p-4 pb-2 border-b-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Company
            </h3>
            <p className="text-sm text-muted-foreground font-normal">
              Job directory profile (Breneo job aggregator). This links your user to
              your organization for public job listings.
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {aggregatorLoading ? (
              <p className="text-sm text-muted-foreground">Loading company…</p>
            ) : primaryAggregatorCompany ? (
              <div className="rounded-2xl border border-border/60 p-4 bg-muted/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {typeof primaryAggregatorCompany.logo === "string" &&
                  primaryAggregatorCompany.logo.trim() ? (
                    <img
                      src={primaryAggregatorCompany.logo}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover border border-border/60 shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      {primaryAggregatorCompany.name ?? "Company"}
                    </p>
                    {primaryAggregatorCompany.domain ? (
                      <p className="text-sm text-muted-foreground">
                        {String(primaryAggregatorCompany.domain)}
                      </p>
                    ) : null}
                    {primaryAggregatorCompany.company_email ? (
                      <p className="text-sm inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {primaryAggregatorCompany.company_email}
                      </p>
                    ) : null}
                  </div>
                </div>
                {primaryAggregatorCompany.description ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {String(primaryAggregatorCompany.description)}
                  </p>
                ) : null}
                {primaryAggregatorCompany.website ? (
                  <a
                    href={
                      /^https?:\/\//i.test(String(primaryAggregatorCompany.website))
                        ? String(primaryAggregatorCompany.website)
                        : `https://${String(primaryAggregatorCompany.website).replace(/^\/\//, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {String(primaryAggregatorCompany.website)}
                  </a>
                ) : null}
                {Array.isArray(primaryAggregatorCompany.industries) &&
                primaryAggregatorCompany.industries.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {primaryAggregatorCompany.industries.map((ind) => (
                      <span
                        key={`${ind.id}-${ind.name}`}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                      >
                        {ind.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                {primaryAggregatorCompany.job_count != null ? (
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {String(primaryAggregatorCompany.job_count)} job
                    {Number(primaryAggregatorCompany.job_count) === 1 ? "" : "s"}{" "}
                    on the directory
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No company on the job directory yet. Search for an existing
                  organization or create a new one; your account is linked via
                  staff memberships.
                </p>
                <Button
                  type="button"
                  onClick={() => setCompanyPickerOpen(true)}
                  disabled={!profile}
                >
                  Add or join company
                </Button>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-border/60 p-4 bg-muted/10">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Building2 className="h-4 w-4" />
                Breneo profile (edit logo & details)
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Company name, description, and logo for your main Breneo profile. Use
                Edit above or here to update.
              </p>
              <div className="flex flex-row items-center gap-4">
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
                <div className="min-w-0">
                  <p className="font-medium truncate">{displayName}</p>
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate block"
                    >
                      {websiteRaw}
                    </a>
                  ) : null}
                </div>
              </div>
              {profile?.description ? (
                <p className="text-sm mt-3 text-muted-foreground line-clamp-3">
                  {profile.description}
                </p>
              ) : null}
            </div>
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

      <Dialog open={companyPickerOpen} onOpenChange={setCompanyPickerOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job directory company</DialogTitle>
            <DialogDescription>
              Search the job directory to join a company. If none matches, use
              Create new company to add the name immediately, or fill the fields
              below and save — your Breneo profile will be updated to match.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <EmployerCompanySearchField
              existingCompaniesOnly
              onQuickCreateCompany={handleQuickCreateDirectoryCompany}
              disabled={pickerSaving}
              selected={pickerSelected}
              onSelectExisting={(c) => {
                setPickerSelected(c);
                if (c?.name) setPickerName(String(c.name));
                else setPickerName("");
              }}
              companyName={pickerName}
              onCompanyNameChange={setPickerName}
            />
            {!pickerSelected ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="picker-domain">Domain</Label>
                  <Input
                    id="picker-domain"
                    value={pickerDomain}
                    onChange={(e) => setPickerDomain(e.target.value)}
                    disabled={pickerSaving}
                    placeholder="e.g. acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="picker-logo">Logo URL (optional)</Label>
                  <Input
                    id="picker-logo"
                    type="url"
                    value={pickerLogoUrl}
                    onChange={(e) => setPickerLogoUrl(e.target.value)}
                    disabled={pickerSaving}
                    placeholder="https://…"
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="picker-desc">Description</Label>
              <Textarea
                id="picker-desc"
                value={pickerDescription}
                onChange={(e) => setPickerDescription(e.target.value)}
                disabled={pickerSaving}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Employees</Label>
              <Select
                value={pickerEmployees}
                onValueChange={setPickerEmployees}
                disabled={pickerSaving}
              >
                <SelectTrigger className="h-[3rem]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {EMP_AGG_EMPLOYEE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industries</Label>
              {industryCatalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Industries list is loading or unavailable.
                </p>
              ) : (
                <IndustryMultiSelect
                  industries={industryCatalog}
                  value={pickerIndustryIds}
                  onChange={setPickerIndustryIds}
                  disabled={pickerSaving}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompanyPickerOpen(false)}
              disabled={pickerSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleCompanyDirectorySubmit} disabled={pickerSaving}>
              {pickerSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
