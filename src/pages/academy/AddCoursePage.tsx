import React, { useState, useEffect, useRef } from "react";
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
import { UploadCloud, X, Trash2 } from "lucide-react";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { normalizeAcademyProfileApiResponse } from "@/api/academy";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Interfaces
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  provider: string;
  required_skills: string[];
  topics: string[];
  image: string;
  enrolled: boolean;
  popular: boolean;
  is_academy_course: boolean;
  created_at: string;
}

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
    category: "",
    level: "",
    duration: "",
    required_skills: "",
    topics: "",
    registration_link: "",
  });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!courseId;

  const fetchAcademyData = async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);

      if (response.data) {
        const data = response.data;
        const normalized = normalizeAcademyProfileApiResponse(
          data as Parameters<typeof normalizeAcademyProfileApiResponse>[0],
          user?.id != null ? String(user.id) : undefined
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
    } catch (error: any) {
      console.error("Failed to load academy profile:", error);
      if (error.response?.status === 404) {
        toast.error("Please set up your academy profile first");
        navigate("/academy/profile");
      } else {
        toast.error("Failed to load academy profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCourse = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCourseForm({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          level: data.level || "",
          duration: data.duration || "",
          required_skills: (data.required_skills || []).join(", "),
          topics: (data.topics || []).join(", "),
          registration_link: data.registration_link || "",
        });
        setImagePreview(data.image || null);
      }
    } catch (error: any) {
      console.error("Error fetching course:", error);
      toast.error(error.message || "Failed to load course");
      navigate("/academy/dashboard");
    }
  };

  useEffect(() => {
    fetchAcademyData();
  }, [user]);

  useEffect(() => {
    if (courseId && academyProfile) {
      fetchCourse(courseId);
    }
  }, [courseId, academyProfile]);

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

      setCourseImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setCourseImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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
      // Process required skills and topics
      const requiredSkills = courseForm.required_skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const topics = courseForm.topics
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      // Handle image upload
      let imageUrl = "/lovable-uploads/no_photo.png"; // Default placeholder

      if (courseImage) {
        try {
          // Upload image to Supabase storage
          const fileExt = courseImage.name.split(".").pop();
          const fileName = `${academyProfile.id}/${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("course-images")
              .upload(fileName, courseImage, {
                cacheControl: "3600",
                upsert: false,
              });

          if (uploadError) {
            console.error("❌ Image upload error:", uploadError);

            if (
              uploadError.message?.includes("Bucket not found") ||
              uploadError.message?.includes("does not exist")
            ) {
              toast.error(
                "Storage bucket 'course-images' not found. Please contact support to set it up.",
              );
              throw new Error("Storage bucket not configured");
            }

            if (
              uploadError.message?.includes("permission") ||
              uploadError.message?.includes("policy") ||
              uploadError.statusCode === 403
            ) {
              toast.error(
                "Permission denied. Please check storage bucket policies.",
              );
              throw new Error("Storage permission denied");
            }

            toast.error(
              `Failed to upload image: ${uploadError.message || "Unknown error"}`,
            );
            throw uploadError;
          }

          // Get public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from("course-images")
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          console.error("❌ Image upload failed:", uploadErr);
          throw uploadErr;
        }
      }

      // Get provider name - use academy_name directly from the table
      const providerName = academyProfile.academy_name || "";

      // Insert course directly into Supabase
      const { data: courseData, error: insertError } = await supabase
        .from("courses")
        .insert({
          title: courseForm.title,
          description: courseForm.description,
          category: courseForm.category,
          level: courseForm.level,
          duration: courseForm.duration,
          provider: providerName,
          required_skills: requiredSkills,
          topics: topics,
          image: imageUrl,
          registration_link: courseForm.registration_link,
          enrolled: false,
          popular: false,
          academy_id: academyProfile.id,
          is_academy_course: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success("Course added successfully");
      navigate("/academy/dashboard");
    } catch (error: any) {
      console.error("Error adding course:", error);
      toast.error(error.message || "Failed to add course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!courseId || !academyProfile || !academyProfile.id) return;

    setIsSubmitting(true);
    try {
      // Process required skills and topics
      const requiredSkills = courseForm.required_skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const topics = courseForm.topics
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      // Handle image upload if a new image was provided
      let imageUrl = imagePreview || "/lovable-uploads/no_photo.png";

      if (courseImage) {
        try {
          // Upload new image to Supabase storage
          const fileExt = courseImage.name.split(".").pop();
          const fileName = `${academyProfile.id}/${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("course-images")
              .upload(fileName, courseImage, {
                cacheControl: "3600",
                upsert: false,
              });

          if (uploadError) {
            console.error("❌ Image upload error:", uploadError);

            if (
              uploadError.message?.includes("Bucket not found") ||
              uploadError.message?.includes("does not exist")
            ) {
              toast.error(
                "Storage bucket 'course-images' not found. Please contact support to set it up.",
              );
              throw new Error("Storage bucket not configured");
            }

            if (
              uploadError.message?.includes("permission") ||
              uploadError.message?.includes("policy") ||
              uploadError.statusCode === 403
            ) {
              toast.error(
                "Permission denied. Please check storage bucket policies.",
              );
              throw new Error("Storage permission denied");
            }

            toast.error(
              `Failed to upload image: ${uploadError.message || "Unknown error"}`,
            );
            throw uploadError;
          }

          // Get public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from("course-images")
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          console.error("❌ Image upload failed:", uploadErr);
          throw uploadErr;
        }
      }

      // Get provider name - use academy_name directly from the table
      const providerName = academyProfile.academy_name || "";

      // Update course in Supabase
      const { error: updateError } = await supabase
        .from("courses")
        .update({
          title: courseForm.title,
          description: courseForm.description,
          category: courseForm.category,
          level: courseForm.level,
          duration: courseForm.duration,
          required_skills: requiredSkills,
          topics: topics,
          image: imageUrl,
          provider: providerName,
          registration_link: courseForm.registration_link,
        })
        .eq("id", courseId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Course updated successfully");
      navigate("/academy/dashboard");
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast.error(error.message || "Failed to update course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;

    try {
      // Delete course from Supabase
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) {
        throw error;
      }

      toast.success("Course deleted successfully");
      navigate("/academy/dashboard");
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast.error(error.message || "Failed to delete course");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!academyProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="space-y-6">
            {/* Cover Image - Full Width */}
            <div>
              <Label>Cover Image</Label>
              <div className="mt-1 w-full">
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain rounded-md"
                    />
                    <button
                      onClick={() => handleImageChange(null)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center px-6 pt-5 pb-6 rounded-md bg-muted/50">
                    <div className="space-y-1 text-center">
                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-breneo-blue hover:text-breneo-blue/80 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            ref={fileInputRef}
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => handleImageChange(e.target.files)}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    title: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    description: e.target.value,
                  })
                }
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Category and Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={courseForm.category}
                  onValueChange={(value) =>
                    setCourseForm({ ...courseForm, category: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programming">Programming</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                    <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Select
                  value={courseForm.level}
                  onValueChange={(value) =>
                    setCourseForm({ ...courseForm, level: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <Label htmlFor="skills">Required Skills</Label>
              <Input
                id="skills"
                placeholder="Comma separated skills"
                value={courseForm.required_skills}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    required_skills: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Topics */}
            <div>
              <Label htmlFor="topics">Topics</Label>
              <Input
                id="topics"
                placeholder="Comma separated topics"
                value={courseForm.topics}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, topics: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 8 weeks"
                value={courseForm.duration}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    duration: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Registration Link */}
            <div>
              <Label htmlFor="registration_link">Registration Link</Label>
              <Input
                id="registration_link"
                type="url"
                placeholder="https://example.com/register"
                value={courseForm.registration_link}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    registration_link: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Footer with Delete and Save buttons */}
          <div className="flex justify-between items-center mt-6 pt-6">
            {isEditMode ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <div />
            )}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/academy/dashboard")}
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
