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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DollarSign,
  RotateCcw,
  Video,
  Users,
  Loader2,
  Search,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { cn } from "@/lib/utils";
import { PLATFORM_CHIP_SKILL_CLASS } from "@/lib/chipStyles";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  formatCourseApiError,
  normalizeAcademyProfileApiResponse,
  parseSkillIdsFromCourseApi,
  saveCourse,
} from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { profileApi } from "@/api/profile/profileApi";
import type { SkillSuggestion } from "@/api/profile/types";
import { sanitizeCourseDescription } from "@/utils/courseDescription";
import { useMobile } from "@/hooks/use-mobile";
const MIN_CHARS_FOR_SKILL_SUGGESTIONS = 3;
const SKILL_SUGGESTIONS_DEBOUNCE_MS = 250;
const DESCRIPTION_COLORS = [
  { label: "Charcoal", value: "#1f2937" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
];
const DESCRIPTION_HIGHLIGHTS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Purple", value: "#e9d5ff" },
];
const addCourseDashedFieldShellClass =
  "rounded-lg border border-dashed border-gray-300 bg-transparent transition hover:border-breneo-blue focus-within:border-breneo-blue dark:border-[#444444]";

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
  skills_taught?: unknown;
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

const AddCoursePage = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const isMobile = useMobile();
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
  const descriptionRef = useRef<HTMLDivElement>(null);
  const descriptionSelectionRef = useRef<Range | null>(null);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const initialCoverPositionRef = useRef({ x: 50, y: 50 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lecturerFileInputRef = useRef<HTMLInputElement>(null);
  const [lecturerPhotoFile, setLecturerPhotoFile] = useState<File | null>(null);
  const [lecturerPhotoPreview, setLecturerPhotoPreview] = useState<
    string | null
  >(null);
  const initialCoverSnapshotRef = useRef<string | null>(null);
  const initialLecturerPhotoUrlRef = useRef("");
  const isEditMode = !!courseId;

  const saveDescriptionSelection = useCallback(() => {
    const editor = descriptionRef.current;
    const selection = window.getSelection();
    if (
      editor &&
      selection?.rangeCount &&
      selection.anchorNode &&
      selection.focusNode &&
      editor.contains(selection.anchorNode) &&
      editor.contains(selection.focusNode)
    ) {
      try {
        descriptionSelectionRef.current = selection.getRangeAt(0).cloneRange();
      } catch {
        // Ignore transient browser selections while the caret is moving.
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", saveDescriptionSelection);
    return () => document.removeEventListener("selectionchange", saveDescriptionSelection);
  }, [saveDescriptionSelection]);

  const runDescriptionCommand = (command: string, value?: string) => {
    const editor = descriptionRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    const savedRange = descriptionSelectionRef.current;
    if (
      !selection ||
      !savedRange ||
      !editor.contains(savedRange.startContainer) ||
      !editor.contains(savedRange.endContainer)
    ) {
      toast.info("Place the cursor in the description before using formatting.");
      return;
    }
    editor.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(savedRange);
    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
    } catch (error) {
      console.warn(`Description formatting command failed: ${command}`, error);
      return;
    }
    setCourseForm((prev) => ({
      ...prev,
      description: sanitizeCourseDescription(editor.innerHTML),
    }));
    saveDescriptionSelection();
  };

  const applyDescriptionBlockStyle = (tagName: string) => {
    const editor = descriptionRef.current;
    if (!editor || !/^h[1-5]$|^p$/.test(tagName)) return;

    const selection = window.getSelection();
    const savedRange = descriptionSelectionRef.current;
    editor.focus({ preventScroll: true });
    if (
      !selection ||
      !savedRange ||
      !editor.contains(savedRange.startContainer) ||
      !editor.contains(savedRange.endContainer)
    ) {
      toast.info("Select text in the description before choosing a text style.");
      return;
    }
    selection.removeAllRanges();
    selection.addRange(savedRange);
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!selection || !activeRange || activeRange.collapsed || !editor.contains(activeRange.commonAncestorContainer)) {
      toast.info("Select the text you want to format first.");
      return;
    }

    const fragment = activeRange.extractContents();
    const clearHeadingStyle = (parent: Node) => {
      Array.from(parent.childNodes).forEach((child) => {
        if (child instanceof HTMLElement) {
          const isHeadingStyle = child.dataset.courseTextStyle != null ||
            ["1em", "1.05em", "1.17em", "1.5em", "2em"].includes(child.style.fontSize);
          if (isHeadingStyle) {
            child.style.removeProperty("font-size");
            child.style.removeProperty("font-weight");
            delete child.dataset.courseTextStyle;
            if (!child.getAttribute("style")?.trim()) child.removeAttribute("style");
          }
        }
        clearHeadingStyle(child);
      });
    };
    clearHeadingStyle(fragment);
    if (tagName !== "p") {
      const wrapSelectedText = (parent: Node) => {
        Array.from(parent.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent) {
            const span = document.createElement("span");
            span.dataset.courseTextStyle = tagName;
            span.style.fontSize = { h1: "2em", h2: "1.5em", h3: "1.17em", h4: "1.05em", h5: "1em" }[tagName];
            span.style.fontWeight = "bold";
            span.textContent = child.textContent;
            parent.replaceChild(span, child);
          } else {
            wrapSelectedText(child);
          }
        });
      };
      wrapSelectedText(fragment);
    }
    const firstInsertedNode = fragment.firstChild;
    const lastInsertedNode = fragment.lastChild;
    if (!firstInsertedNode || !lastInsertedNode) return;
    activeRange.insertNode(fragment);
    const formattedRange = document.createRange();
    formattedRange.setStartBefore(firstInsertedNode);
    formattedRange.setEndAfter(lastInsertedNode);
    selection.removeAllRanges();
    selection.addRange(formattedRange);

    setCourseForm((prev) => ({
      ...prev,
      description: sanitizeCourseDescription(editor.innerHTML),
    }));
    saveDescriptionSelection();
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
        const response = await apiClient.get<ApiCourse>(
          `${API_ENDPOINTS.COURSES}${id}/`,
        );
        const data = response.data;

        if (data) {
          const skillIds = parseSkillIdsFromCourseApi(data);
          const labels: Record<number, string> = {};
          if (Array.isArray(data.skills_taught)) {
            for (const item of data.skills_taught) {
              if (!item || typeof item !== "object") continue;
              const o = item as Record<string, unknown>;
              const skillId = Number(o.id);
              const name = String(o.name ?? "").trim();
              if (Number.isInteger(skillId) && skillId > 0 && name) {
                labels[skillId] = name;
              }
            }
          }
          setSkillChipLabels(labels);

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
            required_skills: skillIds.join(", "),
            lecturer_name: String(data.lecturer_name ?? ""),
            lecturer_photo_url: String(data.lecturer_photo_url ?? ""),
          });
          if (descriptionRef.current) {
            descriptionRef.current.innerHTML = sanitizeCourseDescription(
              String(data.description ?? ""),
            );
          }
          const coverUrl =
            normalizeImageUrl(
              data.cover_image_url || data.lecturer_photo_url,
            ) || null;
          setImagePreview(coverUrl);
          setCoverPosition({ x: 50, y: 50 });
          initialCoverPositionRef.current = { x: 50, y: 50 };
          initialCoverSnapshotRef.current = coverUrl;
          setLecturerPhotoFile(null);
          setLecturerPhotoPreview(null);
          initialLecturerPhotoUrlRef.current = String(
            data.lecturer_photo_url ?? "",
          );
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
      initialLecturerPhotoUrlRef.current = "";
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
      setCoverPosition({ x: 50, y: 50 });
      initialCoverPositionRef.current = { x: 50, y: 50 };
    } else {
      setCoverImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getPositionedCoverFile = async (): Promise<File | null> => {
    if (!imagePreview) return coverImageFile;
    let sourceFile = coverImageFile;
    let sourceUrl = imagePreview;
    if (!sourceFile) {
      if (coverPosition.x === 50 && coverPosition.y === 50) return null;
      const response = await fetch(imagePreview);
      const blob = await response.blob();
      sourceFile = new File([blob], "course-cover", { type: blob.type || "image/jpeg" });
      sourceUrl = URL.createObjectURL(sourceFile);
    }
    const image = new Image();
    image.src = sourceUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load cover image"));
    });
    // Match the course page desktop cover frame (max-w-5xl with padding, h-96).
    const ratio = 2.58;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const cropWidth = sourceRatio > ratio ? image.naturalHeight * ratio : image.naturalWidth;
    const cropHeight = sourceRatio > ratio ? image.naturalHeight : image.naturalWidth / ratio;
    const sx = (image.naturalWidth - cropWidth) * coverPosition.x / 100;
    const sy = (image.naturalHeight - cropHeight) * coverPosition.y / 100;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);
    const context = canvas.getContext("2d");
    if (!context) return coverImageFile;
    context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    return blob ? new File([blob], `${sourceFile.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" }) : sourceFile;
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

  const courseWriteFromForm = (skillIds: number[], academyName?: string) => {
    const clearLecturerPhoto =
      isEditMode &&
      lecturerPhotoFile == null &&
      courseForm.lecturer_photo_url.trim() === "" &&
      initialLecturerPhotoUrlRef.current.trim() !== "";
    const clearCoverImage =
      isEditMode &&
      coverImageFile == null &&
      imagePreview == null &&
      Boolean(initialCoverSnapshotRef.current);

    return {
      fields: {
        title: courseForm.title,
        description: courseForm.description,
        level: courseForm.level,
        language: courseForm.language,
        location: courseForm.location,
        price: Number(courseForm.price || 0),
        lessons_count: Number.parseInt(courseForm.lessons_count || "0", 10),
        total_duration: courseForm.total_duration,
        skillIds,
        lecturer_name: courseForm.lecturer_name || "",
        academy_name: academyName,
        clearLecturerPhoto,
        clearCoverImage,
      },
      files: {
        coverImageFile,
        lecturerPhotoFile,
      },
    };
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

      const { fields, files } = courseWriteFromForm(
        requiredSkills,
        academyProfile.academy_name,
      );
      files.coverImageFile = await getPositionedCoverFile();
      await saveCourse("post", API_ENDPOINTS.COURSES, fields, files);

      toast.success("Course added successfully");
      navigate("/academy/courses");
    } catch (error: unknown) {
      console.error("Error adding course:", error);
      toast.error(formatCourseApiError(error, "Failed to add course"));
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

      const { fields, files } = courseWriteFromForm(requiredSkills);
      files.coverImageFile = await getPositionedCoverFile();
      await saveCourse(
        "patch",
        `${API_ENDPOINTS.COURSES}${courseId}/`,
        fields,
        files,
      );

      toast.success("Course updated successfully");
      navigate("/academy/courses");
    } catch (error: unknown) {
      console.error("Error updating course:", error);
      toast.error(formatCourseApiError(error, "Failed to update course"));
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

  const deleteCourseTrigger = (
    <Button
      variant="ghost"
      aria-label="Delete course"
      title="Delete course"
      className="h-10 w-10 rounded-lg bg-red-50 p-0 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete course</span>
    </Button>
  );

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
      <div className="px-0 pt-6 pb-40 md:px-6 md:pt-8 md:pb-44 lg:px-8 mb-16 sm:mb-20">
        <div className="max-w-7xl mx-auto pb-20">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-card">
          {/* Cover hero — inset and sized like CoursePage's cover */}
          <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="relative isolate aspect-[2.58/1] w-full overflow-hidden rounded-xl border border-dashed border-gray-300 dark:border-[#444444]">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt=""
                className="absolute inset-0 h-full w-full cursor-move touch-none object-cover"
                style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const startX = event.clientX;
                  const startY = event.clientY;
                  const initial = coverPosition;
                  const move = (moveEvent: PointerEvent) => setCoverPosition({
                    x: Math.max(0, Math.min(100, initial.x - (moveEvent.clientX - startX) / bounds.width * 100)),
                    y: Math.max(0, Math.min(100, initial.y - (moveEvent.clientY - startY) / bounds.height * 100)),
                  });
                  const stop = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", stop);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", stop, { once: true });
                }}
                draggable={false}
                aria-label="Drag to reposition cover image"
                title="Drag to reposition cover image"
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

            {imagePreview && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white shadow backdrop-blur-sm">
                Drag image to reposition
              </div>
            )}

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
          </div>

          <div className="space-y-0">
            <div className="space-y-4 px-4 py-4 sm:p-6">
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

              {/* Course title */}
              <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
                <div className={addCourseDashedFieldShellClass}>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                    className="h-auto min-h-[3rem] sm:min-h-[3.5rem] w-full rounded-lg border-0 bg-transparent px-3 py-3 sm:py-4 text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-black caret-black shadow-none outline-none placeholder:text-lg sm:placeholder:text-xl md:placeholder:text-2xl placeholder:text-gray-400 placeholder:font-normal focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:caret-white dark:placeholder:text-gray-400"
                    placeholder="Add a title"
                  />
                </div>
              </div>

              {/* Course details: values are directly editable */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-gray-300 p-3 dark:border-[#444444] sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
                <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500"><DollarSign className="h-4 w-4 text-breneo-blue" />Price</div>
                  <div className="flex items-center gap-2"><Input id="price" inputMode="decimal" placeholder="0.00" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} className="h-[3.2rem] min-w-0" /><span className="text-xs text-muted-foreground">Course</span></div>
                </div>
                <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500"><RotateCcw className="h-4 w-4 text-breneo-blue" />Duration</div>
                  <Input id="total_duration" placeholder="e.g., 8 weeks" value={courseForm.total_duration} onChange={(e) => setCourseForm({ ...courseForm, total_duration: e.target.value })} className="h-[3.2rem]" />
                </div>
                <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500"><Video className="h-4 w-4 text-breneo-blue" />Lectures</div>
                  <Input id="lessons_count" inputMode="numeric" placeholder="0" value={courseForm.lessons_count} onChange={(e) => setCourseForm({ ...courseForm, lessons_count: e.target.value })} className="h-[3.2rem]" />
                </div>
                <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500"><Users className="h-4 w-4 text-breneo-blue" />Level</div>
                  <Select value={courseForm.level || undefined} onValueChange={(value) => setCourseForm({ ...courseForm, level: value })}>
                    <SelectTrigger className="h-[3.2rem]"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rich text course description */}
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-[#444444]">
                <div className="overflow-hidden rounded-lg">
                  <div onPointerDown={saveDescriptionSelection} className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/60" role="toolbar" aria-label="Description formatting">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" onMouseDown={saveDescriptionSelection} className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                          Text style <span className="ml-1 text-gray-400">▾</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 rounded-xl p-1.5" onCloseAutoFocus={(event) => { event.preventDefault(); descriptionRef.current?.focus({ preventScroll: true }); }}>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Block style</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {[
                          ["Paragraph", "p", "text-sm"],
                          ["Heading 1", "h1", "text-xl font-bold"],
                          ["Heading 2", "h2", "text-lg font-bold"],
                          ["Heading 3", "h3", "text-base font-semibold"],
                          ["Heading 4", "h4", "text-sm font-semibold"],
                          ["Heading 5", "h5", "text-xs font-semibold"],
                        ].map(([label, tag, style]) => (
                          <DropdownMenuItem key={tag} onSelect={() => applyDescriptionBlockStyle(tag)} className={`rounded-lg ${style}`}>
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {[
                      ["Bold", "bold", "B", "font-bold"],
                      ["Italic", "italic", "I", "italic"],
                      ["Underline", "underline", "U", "underline"],
                      ["Strikethrough", "strikeThrough", "S", "line-through"],
                      ["Bulleted list", "insertUnorderedList", "• List", ""],
                      ["Numbered list", "insertOrderedList", "1. List", ""],
                    ].map(([label, command, text, style]) => (
                      <button
                        key={command}
                        type="button"
                        aria-label={label}
                        title={label}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runDescriptionCommand(command)}
                        className={`h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${style}`}
                      >
                        {text}
                      </button>
                    ))}
                    <button type="button" aria-label="Add link" title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                      const href = window.prompt("Enter a link URL");
                      if (href?.trim()) runDescriptionCommand("createLink", href.trim());
                    }} className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Link</button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" onMouseDown={saveDescriptionSelection} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><span className="font-bold">A</span><span>Text color</span><span className="text-gray-400">▾</span></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44 rounded-xl p-1.5" onCloseAutoFocus={(event) => { event.preventDefault(); descriptionRef.current?.focus({ preventScroll: true }); }}>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Text color</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="grid grid-cols-3 gap-1 p-1">
                          {DESCRIPTION_COLORS.map((color) => (
                            <DropdownMenuItem key={color.value} onSelect={() => runDescriptionCommand("foreColor", color.value)} className="flex h-9 justify-center rounded-lg p-1" aria-label={color.label} title={color.label}>
                              <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: color.value }} />
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" onMouseDown={saveDescriptionSelection} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><span>Highlight</span><span className="text-gray-400">▾</span></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44 rounded-xl p-1.5" onCloseAutoFocus={(event) => { event.preventDefault(); descriptionRef.current?.focus({ preventScroll: true }); }}>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Highlight color</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="grid grid-cols-3 gap-1 p-1">
                          {DESCRIPTION_HIGHLIGHTS.map((color) => (
                            <DropdownMenuItem key={color.value} onSelect={() => runDescriptionCommand("hiliteColor", color.value)} className="flex h-9 justify-center rounded-lg p-1" aria-label={color.label} title={color.label}>
                              <span className="h-5 w-5 rounded-md border border-black/10" style={{ backgroundColor: color.value }} />
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button type="button" aria-label="Clear formatting" title="Clear formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => runDescriptionCommand("removeFormat")} className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Clear</button>
                  </div>
                  <div
                    ref={descriptionRef}
                    id="description"
                    role="textbox"
                    aria-label="Course description"
                    aria-multiline="true"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Describe what students will learn..."
                    onInput={(event) => setCourseForm((prev) => ({ ...prev, description: sanitizeCourseDescription(event.currentTarget.innerHTML) }))}
                    onPointerUp={saveDescriptionSelection}
                    onMouseUp={saveDescriptionSelection}
                    onKeyUp={saveDescriptionSelection}
                    onBlur={() => {
                      const editor = descriptionRef.current;
                      if (!editor) return;
                      const clean = sanitizeCourseDescription(editor.innerHTML);
                      setCourseForm((prev) => ({ ...prev, description: clean }));
                    }}
                    className="min-h-[180px] w-full whitespace-pre-wrap px-3 py-3 text-base leading-relaxed text-gray-900 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 focus-visible:ring-0 dark:text-gray-100 [&_h1]:my-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:text-base [&_h5]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 pb-4 sm:grid-cols-2">
                {/* Required skills — same shell as description (transparent + dashed border) */}
                <div
                  className="w-full min-w-0 rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-4 dark:border-[#444444] dark:bg-white/[0.03]"
                >
                  <div className="space-y-1">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label htmlFor="course_required_skills" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Required skills</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">Add the skills students need for this course.</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">{skillIds.length} selected</span>
                    </div>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="course_required_skills"
                        placeholder="Search skills or enter an ID"
                        value={skillSearchDraft}
                        onChange={(e) => setSkillSearchDraft(e.target.value)}
                        onKeyDown={handleCourseSkillKeyDown}
                        className="h-[3.2rem] pl-9"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Type to search, then select a suggestion or press Enter. You can also enter a skill ID.
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
                          <ul className="absolute z-10 mt-2 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            {filteredSkillSuggestions.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:hover:bg-gray-800 dark:focus:bg-gray-800"
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
                    <div className="mt-3 min-h-12 rounded-xl border border-dashed border-gray-200 bg-white/80 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex flex-wrap gap-2">
                        {skillIds.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-0.5">
                            No skills yet. Search above or enter an ID.
                          </p>
                        ) : (
                          skillIds.map((id) => (
                            <Badge
                              key={id}
                              variant="outline"
                              className={cn("rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200", PLATFORM_CHIP_SKILL_CLASS)}
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
                  className="w-full min-w-0 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-[#444444]"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Language · Location</Label>
                    <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
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
                          className="mt-1 h-[3.2rem]"
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
                          className="mt-1 h-[3.2rem]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
              <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-[#444444] dark:bg-white/[0.03] sm:max-w-xl">
              <input
                ref={lecturerFileInputRef}
                id="lecturer_photo"
                name="lecturer_photo"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleLecturerPhotoChange(e.target.files)}
              />
              <button
                type="button"
                onClick={() => lecturerFileInputRef.current?.click()}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#AAF0FF] text-2xl font-bold text-[#099DBC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breneo-blue focus-visible:ring-offset-2"
                aria-label={lecturerDisplaySrc ? "Change lecturer photo" : "Add lecturer photo"}
                title="Click to change photo"
              >
                {lecturerDisplaySrc ? (
                  <img src={lecturerDisplaySrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{courseForm.lecturer_name.trim().charAt(0).toUpperCase() || "L"}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-0.5 py-1 text-[10px] font-medium leading-none text-white">Change photo</span>
              </button>
              {lecturerDisplaySrc && (
                <button
                  type="button"
                  onClick={() => handleLecturerPhotoChange(null)}
                  className="-ml-2 -mt-9 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow hover:text-red-600 dark:bg-gray-800"
                  aria-label="Remove lecturer photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <label htmlFor="lecturer_name" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-400">Lecturer</label>
                <Input
                  id="lecturer_name"
                  placeholder="Lecturer name"
                  value={courseForm.lecturer_name}
                  onChange={(e) => setCourseForm({ ...courseForm, lecturer_name: e.target.value })}
                  className="h-[3.2rem] max-w-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 sm:gap-4 sm:px-6 dark:border-gray-800">
            {isEditMode ? (
              isMobile ? (
                <Drawer>
                  <DrawerTrigger asChild>{deleteCourseTrigger}</DrawerTrigger>
                  <DrawerContent className="border-none bg-white dark:bg-background">
                    <DrawerHeader className="items-start pb-0">
                      <DrawerTitle>Delete this course?</DrawerTitle>
                      <DrawerDescription>
                        This will permanently delete the course and cannot be undone.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter className="pt-6">
                      <Button
                        onClick={handleDeleteCourse}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete course
                      </Button>
                      <DrawerClose asChild>
                        <Button variant="ghost" className="w-full bg-muted hover:bg-muted/80">Cancel</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>{deleteCourseTrigger}</AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the course and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="border-0 bg-muted hover:bg-muted/80">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCourse}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete course
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            ) : (
              <div className="hidden sm:block" />
            )}
            <div className="flex min-w-0 gap-2 justify-end sm:gap-4">
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
      </div>
    </DashboardLayout>
  );
};

export default AddCoursePage;
