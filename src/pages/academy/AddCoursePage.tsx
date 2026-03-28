import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UploadCloud,
  X,
  Trash2,
  Pencil,
  Check,
  DollarSign,
  RotateCcw,
  Video,
  Users,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { cn } from "@/lib/utils";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeAcademyProfileApiResponse } from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { profileApi } from "@/api/profile/profileApi";
import type { SkillSuggestion } from "@/api/profile/types";

const MIN_CHARS_FOR_SKILL_SUGGESTIONS = 3;
const SKILL_SUGGESTIONS_DEBOUNCE_MS = 250;

type ApiCourse = {
  id?: string | number | null;
  title?: string | null;
  academy_id?: string | number | null;
  academy_name?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  level?: string | null;
  language?: string | null;
  location?: string | null;
  price?: string | number | null;
  lessons_count?: number | null;
  total_duration?: string | null;
  required_skills?: unknown;
  registration_link?: string | null;
  lecturer_name?: string | null;
  lecturer_photo_url?: string | null;
  is_enrolled?: boolean | null;
};

interface AcademyProfile {
  id: string;
  academy_name: string;
  first_name?: string;
  description: string;
  website_url: string;
  contact_email: string;
  is_verified: boolean;
  logo_url: string | null;
}

const normalizeImageUrl = (value: string | null | undefined) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

const parseRequiredSkillIds = (raw: string): number[] => {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
};

type EditingSection = null | "price" | "duration" | "lessons" | "level";

/** Matches description (and title) dashed outline — single source of truth */
const addCourseDashedFieldShellClass =
  "rounded-lg border border-dashed border-gray-300 bg-transparent transition hover:border-breneo-blue focus-within:border-breneo-blue dark:border-[#444444]";

const AddCoursePage = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    level: "",
    language: "",
    location: "",
    price: "0.00",
    lessons_count: "0",
    total_duration: "",
    required_skills: "",
    lecturer_name: "",
    lecturer_photo_url: "",
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lecturerFileInputRef = useRef<HTMLInputElement>(null);
  const [lecturerPhotoFile, setLecturerPhotoFile] = useState<File | null>(null);
  const [lecturerPhotoPreview, setLecturerPhotoPreview] = useState<
    string | null
  >(null);
  const initialCoverSnapshotRef = useRef<string | null>(null);
  const sectionBaselineRef = useRef<
    Partial<Record<Exclude<EditingSection, null>, string>>
  >({});
  const isEditMode = !!courseId;
  const [editingSection, setEditingSection] = useState<EditingSection>(null);

  const captureBaseline = (section: Exclude<EditingSection, null>) => {
    switch (section) {
      case "price":
        sectionBaselineRef.current.price = courseForm.price;
        break;
      case "duration":
        sectionBaselineRef.current.duration = courseForm.total_duration;
        break;
      case "lessons":
        sectionBaselineRef.current.lessons = courseForm.lessons_count;
        break;
      case "level":
        sectionBaselineRef.current.level = courseForm.level;
        break;
      default:
        break;
    }
  };

  const isSectionDirty = (section: Exclude<EditingSection, null>): boolean => {
    if (editingSection !== section) return false;
    switch (section) {
      case "price":
        return courseForm.price !== sectionBaselineRef.current.price;
      case "duration":
        return (
          courseForm.total_duration !== sectionBaselineRef.current.duration
        );
      case "lessons":
        return courseForm.lessons_count !== sectionBaselineRef.current.lessons;
      case "level":
        return courseForm.level !== sectionBaselineRef.current.level;
      default:
        return false;
    }
  };

  const isCoverDirty = (): boolean => {
    if (coverImageFile !== null) return true;
    if (imagePreview === null && initialCoverSnapshotRef.current === null) {
      return false;
    }
    return imagePreview !== initialCoverSnapshotRef.current;
  };

  const toggleSection = (section: Exclude<EditingSection, null>) => {
    setEditingSection((current) => {
      if (current === section) {
        return null;
      }
      captureBaseline(section);
      return section;
    });
  };

  const displayPriceLabel = () => {
    const n = Number(courseForm.price);
    if (!Number.isFinite(n) || n === 0) return "Free";
    return String(courseForm.price);
  };

  const skillIds = useMemo(
    () => parseRequiredSkillIds(courseForm.required_skills),
    [courseForm.required_skills],
  );

  const [skillSearchDraft, setSkillSearchDraft] = useState("");
  /** Names from search/suggestions; IDs loaded from API show as numbers only. */
  const [skillChipLabels, setSkillChipLabels] = useState<
    Record<number, string>
  >({});
  const [skillSuggestions, setSkillSuggestions] = useState<SkillSuggestion[]>(
    [],
  );
  const [loadingSkillSuggestions, setLoadingSkillSuggestions] = useState(false);
  const skillSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const filteredSkillSuggestions = useMemo(
    () => skillSuggestions.filter((s) => !skillIds.includes(s.id)),
    [skillSuggestions, skillIds],
  );

  const addCourseSkillId = useCallback(
    (id: number, displayName?: string) => {
      if (!Number.isInteger(id) || id <= 0) {
        toast.error("Enter a valid skill ID.");
        return;
      }
      if (skillIds.includes(id)) {
        toast.error("This skill is already added.");
        return;
      }
      const next = [...skillIds, id].sort((a, b) => a - b);
      setCourseForm((prev) => ({
        ...prev,
        required_skills: next.join(", "),
      }));
      if (displayName?.trim()) {
        setSkillChipLabels((prev) => ({
          ...prev,
          [id]: displayName.trim(),
        }));
      }
      setSkillSearchDraft("");
      setSkillSuggestions([]);
    },
    [skillIds],
  );

  const removeCourseSkillId = useCallback(
    (id: number) => {
      const next = skillIds.filter((x) => x !== id);
      setCourseForm((prev) => ({
        ...prev,
        required_skills: next.join(", "),
      }));
      setSkillChipLabels((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    },
    [skillIds],
  );

  useEffect(() => {
    const query = skillSearchDraft.trim();
    if (query.length < MIN_CHARS_FOR_SKILL_SUGGESTIONS) {
      setSkillSuggestions([]);
      if (skillSearchDebounceRef.current) {
        clearTimeout(skillSearchDebounceRef.current);
        skillSearchDebounceRef.current = null;
      }
      return;
    }

    if (skillSearchDebounceRef.current) {
      clearTimeout(skillSearchDebounceRef.current);
    }
    skillSearchDebounceRef.current = setTimeout(async () => {
      skillSearchDebounceRef.current = null;
      setLoadingSkillSuggestions(true);
      try {
        const list = await profileApi.searchSkills(query);
        setSkillSuggestions(list);
      } catch {
        setSkillSuggestions([]);
      } finally {
        setLoadingSkillSuggestions(false);
      }
    }, SKILL_SUGGESTIONS_DEBOUNCE_MS);

    return () => {
      if (skillSearchDebounceRef.current) {
        clearTimeout(skillSearchDebounceRef.current);
      }
    };
  }, [skillSearchDraft]);

  const handleCourseSkillKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = skillSearchDraft.trim();
    if (!q) return;
    if (/^\d+$/.test(q)) {
      addCourseSkillId(Number(q));
      return;
    }
    const first = filteredSkillSuggestions[0];
    if (first) {
      addCourseSkillId(first.id, first.name);
      return;
    }
    toast.error("Select a skill from suggestions or enter a numeric skill ID.");
  };

  const lecturerDisplaySrc = useMemo(() => {
    if (lecturerPhotoPreview) return lecturerPhotoPreview;
    const u = courseForm.lecturer_photo_url.trim();
    if (!u) return null;
    return normalizeImageUrl(u);
  }, [lecturerPhotoPreview, courseForm.lecturer_photo_url]);

  const fetchAcademyData = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);

      if (response.data) {
        const data = response.data;
        const normalized = normalizeAcademyProfileApiResponse(
          data as Parameters<typeof normalizeAcademyProfileApiResponse>[0],
          user?.id != null ? String(user.id) : undefined,
        );
        const academyProfile: AcademyProfile = {
          ...normalized,
          first_name:
            normalized.first_name ||
            user?.first_name ||
            normalized.academy_name ||
            "",
          is_verified: data.is_verified ?? false,
          logo_url: normalized.logo_url,
        };
        setAcademyProfile(academyProfile);
      }
    } catch (error: unknown) {
      console.error("Failed to load academy profile:", error);
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        toast.error("Please set up your academy profile first");
        navigate("/academy/profile");
      } else {
        toast.error("Failed to load academy profile");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  const fetchCourse = useCallback(
    async (id: string) => {
      try {
        // No course detail endpoint available; fetch list and pick by id.
        const response = await fetch(
          "https://web-production-80ed8.up.railway.app/api/courses/",
        );
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const json: unknown = await response.json();
        const allCourses: ApiCourse[] = Array.isArray(json)
          ? (json as ApiCourse[])
          : [];
        const data = allCourses.find((c) => String(c?.id) === String(id));

        if (data) {
          const requiredSkills = Array.isArray(data.required_skills)
            ? (data.required_skills as unknown[]).map((s) => String(s))
            : [];

          setSkillChipLabels({});

          setCourseForm({
            title: String(data.title ?? ""),
            description: String(data.description ?? ""),
            level: String(data.level ?? ""),
            language: String(data.language ?? ""),
            location: String(data.location ?? ""),
            price: data.price != null ? String(data.price) : "0.00",
            lessons_count:
              typeof data.lessons_count === "number"
                ? String(data.lessons_count)
                : "0",
            total_duration: String(data.total_duration ?? ""),
            required_skills: requiredSkills.join(", "),
            lecturer_name: String(data.lecturer_name ?? ""),
            lecturer_photo_url: String(data.lecturer_photo_url ?? ""),
          });
          const coverUrl =
            normalizeImageUrl(
              data.cover_image_url || data.lecturer_photo_url,
            ) || null;
          setImagePreview(coverUrl);
          initialCoverSnapshotRef.current = coverUrl;
          setLecturerPhotoFile(null);
          setLecturerPhotoPreview(null);
        }
      } catch (error: unknown) {
        console.error("Error fetching course:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load course",
        );
        navigate("/academy/dashboard");
      }
    },
    [navigate],
  );

  useEffect(() => {
    fetchAcademyData();
  }, [fetchAcademyData]);

  useEffect(() => {
    if (!courseId) {
      initialCoverSnapshotRef.current = null;
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId && academyProfile) {
      fetchCourse(courseId);
    }
  }, [courseId, academyProfile, fetchCourse]);

  useEffect(() => {
    return () => {
      if (lecturerPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(lecturerPhotoPreview);
      }
    };
  }, [lecturerPhotoPreview]);

  const handleImageChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast.error("Image size must be less than 10MB");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // We no longer upload to Supabase storage here; file picker is only for preview.
      setCoverImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setCoverImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLecturerPhotoChange = (files: FileList | null) => {
    if (lecturerPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lecturerPhotoPreview);
    }
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Image size must be less than 10MB");
        if (lecturerFileInputRef.current) {
          lecturerFileInputRef.current.value = "";
        }
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        if (lecturerFileInputRef.current) {
          lecturerFileInputRef.current.value = "";
        }
        return;
      }
      setLecturerPhotoFile(file);
      setLecturerPhotoPreview(URL.createObjectURL(file));
      setCourseForm((prev) => ({ ...prev, lecturer_photo_url: "" }));
    } else {
      setLecturerPhotoFile(null);
      setLecturerPhotoPreview(null);
      setCourseForm((prev) => ({ ...prev, lecturer_photo_url: "" }));
      if (lecturerFileInputRef.current) {
        lecturerFileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async () => {
    if (isEditMode && courseId) {
      await handleUpdateCourse();
    } else {
      await handleAddCourse();
    }
  };

  const handleAddCourse = async () => {
    if (!academyProfile || !academyProfile.id) {
      toast.error("Academy profile ID is missing");
      return;
    }

    setIsSubmitting(true);
    try {
      const requiredSkills = parseRequiredSkillIds(courseForm.required_skills);
      if (
        courseForm.required_skills.trim().length > 0 &&
        requiredSkills.length === 0
      ) {
        toast.error("Required Skills must be comma-separated numeric IDs.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        level: courseForm.level,
        language: courseForm.language,
        location: courseForm.location,
        price: Number(courseForm.price || 0),
        lessons_count: Number.parseInt(courseForm.lessons_count || "0", 10),
        total_duration: courseForm.total_duration,
        required_skills: requiredSkills,
        registration_link: null,
        lecturer_name: courseForm.lecturer_name || "",
        lecturer_photo_url: courseForm.lecturer_photo_url || null,
        academy_name: academyProfile.academy_name,
      };

      const needsMultipart =
        coverImageFile !== null || lecturerPhotoFile !== null;

      if (needsMultipart) {
        const formData = new FormData();
        formData.append("title", payload.title);
        formData.append("description", payload.description);
        formData.append("level", payload.level);
        formData.append("language", payload.language);
        formData.append("location", payload.location);
        formData.append("price", String(payload.price));
        formData.append("lessons_count", String(payload.lessons_count));
        formData.append("total_duration", payload.total_duration);
        formData.append("registration_link", "");
        formData.append("lecturer_name", payload.lecturer_name);
        formData.append("lecturer_photo_url", payload.lecturer_photo_url || "");
        formData.append("academy_name", payload.academy_name || "");
        requiredSkills.forEach((id) =>
          formData.append("required_skills", String(id)),
        );
        if (coverImageFile) {
          formData.append("cover_image", coverImageFile);
        }
        if (lecturerPhotoFile) {
          formData.append("lecturer_photo", lecturerPhotoFile);
        }

        await apiClient.post(API_ENDPOINTS.COURSES, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiClient.post(API_ENDPOINTS.COURSES, payload);
      }

      toast.success("Course added successfully");
      navigate("/academy/courses");
    } catch (error: unknown) {
      console.error("Error adding course:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add course",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!courseId || !academyProfile || !academyProfile.id) return;

    setIsSubmitting(true);
    try {
      const requiredSkills = parseRequiredSkillIds(courseForm.required_skills);
      if (
        courseForm.required_skills.trim().length > 0 &&
        requiredSkills.length === 0
      ) {
        toast.error("Required Skills must be comma-separated numeric IDs.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        level: courseForm.level,
        language: courseForm.language,
        location: courseForm.location,
        price: Number(courseForm.price || 0),
        lessons_count: Number.parseInt(courseForm.lessons_count || "0", 10),
        total_duration: courseForm.total_duration,
        required_skills: requiredSkills,
        registration_link: null,
        lecturer_name: courseForm.lecturer_name || "",
        lecturer_photo_url: courseForm.lecturer_photo_url || null,
      };

      const needsMultipart =
        coverImageFile !== null || lecturerPhotoFile !== null;

      if (needsMultipart) {
        const formData = new FormData();
        formData.append("title", payload.title);
        formData.append("description", payload.description);
        formData.append("level", payload.level);
        formData.append("language", payload.language);
        formData.append("location", payload.location);
        formData.append("price", String(payload.price));
        formData.append("lessons_count", String(payload.lessons_count));
        formData.append("total_duration", payload.total_duration);
        formData.append("registration_link", "");
        formData.append("lecturer_name", payload.lecturer_name);
        formData.append("lecturer_photo_url", payload.lecturer_photo_url || "");
        requiredSkills.forEach((id) =>
          formData.append("required_skills", String(id)),
        );
        if (coverImageFile) {
          formData.append("cover_image", coverImageFile);
        }
        if (lecturerPhotoFile) {
          formData.append("lecturer_photo", lecturerPhotoFile);
        }

        await apiClient.patch(
          `${API_ENDPOINTS.COURSES}${courseId}/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } else {
        await apiClient.patch(`${API_ENDPOINTS.COURSES}${courseId}/`, payload);
      }

      toast.success("Course updated successfully");
      navigate("/academy/courses");
    } catch (error: unknown) {
      console.error("Error updating course:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update course",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;

    try {
      await apiClient.delete(`${API_ENDPOINTS.COURSES}${courseId}/`);

      toast.success("Course deleted successfully");
      navigate("/academy/courses");
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete course",
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout containMainScroll={false}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!academyProfile) {
    return (
      <DashboardLayout containMainScroll={false}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">
              Academy Profile Not Found
            </h2>
            <p className="text-muted-foreground">
              Please contact support to set up your academy profile.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout containMainScroll={false}>
      <input
        ref={fileInputRef}
        id="course-cover-upload"
        name="course-cover-upload"
        type="file"
        className="sr-only"
        onChange={(e) => handleImageChange(e.target.files)}
        accept="image/*"
      />
      <div className="px-4 py-4 sm:px-6 sm:py-6 pb-40 sm:pb-44 mb-16 sm:mb-20">
        <div className="max-w-7xl mx-auto pb-20">
          {/* Cover hero */}
          <div className="relative isolate mb-6 w-full overflow-hidden rounded-2xl sm:rounded-3xl h-44 sm:h-80">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300/90 to-slate-400/75 dark:from-slate-800 dark:to-slate-900" />
            )}

            {imagePreview && (
              <button
                type="button"
                onClick={() => handleImageChange(null)}
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Remove cover image"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full border-0 bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Edit cover image"
              >
                {isCoverDirty() ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Pencil className="h-4 w-4 text-gray-800" />
                )}
              </Button>
            </div>

            {!imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 text-sm text-gray-600"
              >
                <UploadCloud className="h-10 w-10 text-gray-400" />
                <span className="font-medium text-breneo-blue">
                  Add cover image
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG up to 10MB
                </span>
              </button>
            )}
          </div>

          <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white">
            <CardContent className="p-6 sm:p-6 space-y-0">
              {/* Academy */}
              <div className="flex items-center gap-3 pb-2">
                <OptimizedAvatar
                  src={academyProfile.logo_url || undefined}
                  alt={academyProfile.academy_name}
                  fallback={
                    academyProfile.academy_name
                      ? academyProfile.academy_name.charAt(0).toUpperCase()
                      : "A"
                  }
                  size="sm"
                  className="flex-shrink-0 !h-10 !w-10 !rounded-sm"
                />
                <span className="text-gray-600 text-base font-medium">
                  {academyProfile.academy_name}
                </span>
              </div>

              {/* Title — same dashed border + focus ring as description */}
              <div className="pb-3 sm:pb-4">
                <div className={addCourseDashedFieldShellClass}>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                    className="h-auto min-h-[3rem] sm:min-h-[3.5rem] w-full rounded-lg border-0 bg-transparent px-3 py-3 sm:py-4 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-black caret-black shadow-none outline-none placeholder:text-xl sm:placeholder:text-2xl md:placeholder:text-3xl placeholder:text-gray-400 placeholder:font-normal focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:caret-white dark:placeholder:text-gray-400"
                    placeholder="Add a title"
                  />
                </div>
              </div>

              {/* Info row — CoursePage style (each stat in a small box) */}
              <div className="py-0 px-0 sm:py-5 sm:px-0 bg-white dark:bg-white rounded-3xl">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 flex-1 w-full min-w-0">
                    {/* Price */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 flex-shrink-0 w-full sm:w-auto min-w-0 rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-3 sm:min-w-[140px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="h-5 w-5 sm:h-4 sm:w-4 text-breneo-blue" />
                        </div>
                        {editingSection === "price" ? (
                          <Input
                            id="price"
                            placeholder="0.00"
                            value={courseForm.price}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                price: e.target.value,
                              })
                            }
                            className="h-9 max-w-[120px]"
                            autoFocus
                          />
                        ) : (
                          <div className="hidden sm:flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {displayPriceLabel()}
                            </span>
                            <span className="text-xs text-gray-500">
                              Course
                            </span>
                          </div>
                        )}
                        {editingSection !== "price" && (
                          <span className="text-base sm:hidden font-semibold text-gray-900">
                            {displayPriceLabel()}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-breneo-blue"
                        onClick={() => toggleSection("price")}
                        aria-label="Edit price"
                      >
                        {isSectionDirty("price") ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Duration */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 flex-shrink-0 w-full sm:w-auto min-w-0 rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-3 sm:min-w-[140px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <RotateCcw className="h-5 w-5 sm:h-4 sm:w-4 text-breneo-blue" />
                        </div>
                        {editingSection === "duration" ? (
                          <Input
                            id="total_duration"
                            placeholder="e.g., 8 weeks"
                            value={courseForm.total_duration}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                total_duration: e.target.value,
                              })
                            }
                            className="h-9 max-w-[160px]"
                            autoFocus
                          />
                        ) : (
                          <div className="hidden sm:flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {courseForm.total_duration || "—"}
                            </span>
                            <span className="text-xs text-gray-500">
                              Duration
                            </span>
                          </div>
                        )}
                        {editingSection !== "duration" && (
                          <span className="text-base sm:hidden font-semibold text-gray-900">
                            {courseForm.total_duration || "—"}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-breneo-blue"
                        onClick={() => toggleSection("duration")}
                        aria-label="Edit duration"
                      >
                        {isSectionDirty("duration") ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Lessons */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 flex-shrink-0 w-full sm:w-auto min-w-0 rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-3 sm:min-w-[140px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <Video className="h-5 w-5 sm:h-4 sm:w-4 text-breneo-blue" />
                        </div>
                        {editingSection === "lessons" ? (
                          <Input
                            id="lessons_count"
                            inputMode="numeric"
                            placeholder="0"
                            value={courseForm.lessons_count}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                lessons_count: e.target.value,
                              })
                            }
                            className="h-9 max-w-[100px]"
                            autoFocus
                          />
                        ) : (
                          <div className="hidden sm:flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900">
                              {courseForm.lessons_count || "0"}
                            </span>
                            <span className="text-xs text-gray-500">
                              Lectures
                            </span>
                          </div>
                        )}
                        {editingSection !== "lessons" && (
                          <span className="text-base sm:hidden font-semibold text-gray-900">
                            {courseForm.lessons_count || "0"}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-breneo-blue"
                        onClick={() => toggleSection("lessons")}
                        aria-label="Edit lessons count"
                      >
                        {isSectionDirty("lessons") ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Level */}
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-3 flex-shrink-0 w-full sm:w-auto min-w-0 rounded-xl border border-gray-100 bg-gray-50/90 dark:bg-white/5 p-3 sm:min-w-[140px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-breneo-blue/15 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 sm:h-4 sm:w-4 text-breneo-blue" />
                        </div>
                        {editingSection === "level" ? (
                          <Select
                            value={courseForm.level || undefined}
                            onValueChange={(value) =>
                              setCourseForm({ ...courseForm, level: value })
                            }
                          >
                            <SelectTrigger className="h-9 w-[160px]">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">
                                Intermediate
                              </SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="hidden sm:flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 capitalize">
                              {courseForm.level || "All Levels"}
                            </span>
                            <span className="text-xs text-gray-500">Level</span>
                          </div>
                        )}
                        {editingSection !== "level" && (
                          <span className="text-base sm:hidden font-semibold text-gray-900 capitalize">
                            {courseForm.level || "All Levels"}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-breneo-blue"
                        onClick={() => toggleSection("level")}
                        aria-label="Edit level"
                      >
                        {isSectionDirty("level") ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description — same dashed border + corners as lecturer photo upload */}
              <div className={`mt-6 ${addCourseDashedFieldShellClass}`}>
                <Textarea
                  id="description"
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  rows={8}
                  placeholder="Describe what students will learn..."
                  className="resize-y min-h-[220px] w-full rounded-lg border-0 bg-transparent px-3 py-3 text-base sm:text-lg leading-relaxed text-black caret-black shadow-none outline-none placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:caret-white dark:placeholder:text-gray-400"
                />
              </div>

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 items-start pt-6">
                {/* Required skills — same shell as description (transparent + dashed border) */}
                <div
                  className={`w-full max-w-md sm:max-w-lg shrink-0 ${addCourseDashedFieldShellClass} p-3 sm:p-4`}
                >
                  <div className="space-y-1">
                    <Label htmlFor="course_required_skills" className="text-xs">
                      Required skills
                    </Label>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="course_required_skills"
                        placeholder="Search or ID, Enter"
                        value={skillSearchDraft}
                        onChange={(e) => setSkillSearchDraft(e.target.value)}
                        onKeyDown={handleCourseSkillKeyDown}
                        className="pl-9 border-gray-300 dark:border-[#444444]"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter to add. Three+ characters show suggestions, or
                      enter a skill ID.
                    </p>
                    {skillSearchDraft.trim().length >=
                      MIN_CHARS_FOR_SKILL_SUGGESTIONS && (
                      <div className="relative">
                        {loadingSkillSuggestions ? (
                          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading suggestions…
                          </div>
                        ) : filteredSkillSuggestions.length > 0 ? (
                          <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                            {filteredSkillSuggestions.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 outline-none"
                                  onClick={() => addCourseSkillId(s.id, s.name)}
                                >
                                  {s.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                    <div className="rounded-lg px-2 py-2 sm:px-3 sm:py-2.5">
                      <div className="flex flex-wrap gap-2 min-h-[2rem]">
                        {skillIds.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-0.5">
                            No skills yet. Search above or enter an ID.
                          </p>
                        ) : (
                          skillIds.map((id) => (
                            <Badge
                              key={id}
                              variant="outline"
                              className="inline-flex items-center gap-1 capitalize px-3 py-1.5 text-xs rounded-[10px] bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                            >
                              {skillChipLabels[id] ?? id}
                              <button
                                type="button"
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={() => removeCourseSkillId(id)}
                                aria-label={`Remove skill ${id}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language · Location — same shell + inner layout as Required skills */}
                <div
                  className={`min-w-0 flex-1 w-full ${addCourseDashedFieldShellClass} p-3 sm:p-4`}
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Language · Location</Label>
                    <div className="flex flex-col gap-3 pt-1">
                      <div className="w-full min-w-0">
                        <Label htmlFor="language" className="text-xs">
                          Language
                        </Label>
                        <Input
                          id="language"
                          placeholder="e.g., English"
                          value={courseForm.language}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              language: e.target.value,
                            })
                          }
                          className="mt-1 border-gray-300 dark:border-[#444444]"
                        />
                      </div>
                      <div className="w-full min-w-0">
                        <Label htmlFor="location" className="text-xs">
                          Location
                        </Label>
                        <Input
                          id="location"
                          placeholder="e.g., Online"
                          value={courseForm.location}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              location: e.target.value,
                            })
                          }
                          className="mt-1 border-gray-300 dark:border-[#444444]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-none bg-white dark:bg-white mt-6">
            <CardContent className="p-6 sm:p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100 mb-4">
                Lecturer
              </p>
              <input
                ref={lecturerFileInputRef}
                id="lecturer_photo"
                name="lecturer_photo"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleLecturerPhotoChange(e.target.files)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <div>
                  <Label htmlFor="lecturer_name" className="text-xs">
                    Lecturer name
                  </Label>
                  <Input
                    id="lecturer_name"
                    placeholder="e.g., John Doe"
                    value={courseForm.lecturer_name}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        lecturer_name: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lecturer_photo" className="text-xs">
                    Lecturer photo
                  </Label>
                  <div className="mt-1">
                    {lecturerDisplaySrc ? (
                      <div className="space-y-2">
                        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-muted">
                          <img
                            src={lecturerDisplaySrc}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleLecturerPhotoChange(null)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                            aria-label="Remove lecturer photo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => lecturerFileInputRef.current?.click()}
                        >
                          Change photo
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => lecturerFileInputRef.current?.click()}
                        className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-transparent px-2 text-gray-500 transition hover:border-breneo-blue dark:border-[#444444]"
                      >
                        <UploadCloud className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-breneo-blue">
                          Upload photo
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG up to 10MB
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-6 pt-6 border-t border-gray-100">
            {isEditMode ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Course
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the course.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCourse}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div className="hidden sm:block" />
            )}
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate("/academy/courses")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || !courseForm.title || !courseForm.description
                }
                className="bg-breneo-blue hover:bg-breneo-blue/90"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Add Course"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddCoursePage;
