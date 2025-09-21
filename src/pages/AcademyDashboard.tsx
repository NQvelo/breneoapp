import React, { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  BookOpen,
  UploadCloud,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { useMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  description: string;
  website_url: string;
  contact_email: string;
  is_verified: boolean;
  logo_url: string | null;
}

// CourseForm Component
const CourseForm = ({
  courseForm,
  setCourseForm,
  handleImageChange,
  imagePreview,
  className,
}: {
  courseForm: any;
  setCourseForm: any;
  handleImageChange: any;
  imagePreview: string | null;
  className?: string;
}) => (
  <div className={className}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
      <div className="space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
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
      </div>
      <div className="space-y-4">
        <div>
          <Label>Course Image</Label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <div className="relative mx-auto">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-24 w-auto rounded-md object-cover"
                  />
                  <button
                    onClick={() => handleImageChange(null)}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-breneo-blue hover:text-breneo-blue/80 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
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
                </>
              )}
            </div>
          </div>
        </div>
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
      </div>
    </div>
  </div>
);

const AcademyDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    duration: "",
    required_skills: "",
    topics: "",
  });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setEditingCourse(null);
    setCourseForm({
      title: "",
      description: "",
      category: "",
      level: "",
      duration: "",
      required_skills: "",
      topics: "",
    });
    setCourseImage(null);
    setImagePreview(null);
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      required_skills: course.required_skills.join(", "),
      topics: course.topics.join(", "),
    });
    setImagePreview(course.image);
    setOpen(true);
  };

  const fetchAcademyData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("academy_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setAcademyProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load academy profile",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const fetchCourses = useCallback(async () => {
    if (!academyProfile) return;
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("academy_id", academyProfile.id)
        .eq("is_academy_course", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [academyProfile, toast]);

  useEffect(() => {
    fetchAcademyData();
  }, [fetchAcademyData]);

  useEffect(() => {
    if (academyProfile) {
      fetchCourses();
    }
  }, [academyProfile, fetchCourses]);

  useEffect(() => {
    if (open && isMobile && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0 });
    }
  }, [open, isMobile]);

  const handleImageChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setCourseImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setCourseImage(null);
      setImagePreview(null);
    }
  };

  const handleCourseSubmit = async () => {
    if (editingCourse) {
      await handleUpdateCourse();
    } else {
      await handleAddCourse();
    }
  };

  const handleAddCourse = async () => {
    if (!academyProfile) return;
    setIsSubmitting(true);
    try {
      let imageUrl =
        "/lovable-uploads/6bee4aa6-3a7f-4806-98bd-dc73a1955812.png";
      if (courseImage) {
        const fileExt = courseImage.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("course-images")
          .upload(fileName, courseImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("course-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      const courseData = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        level: courseForm.level,
        duration: courseForm.duration,
        provider: academyProfile.academy_name,
        required_skills: courseForm.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        topics: courseForm.topics
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        image: imageUrl,
        academy_id: academyProfile.id,
        is_academy_course: true,
        enrolled: false,
        popular: false,
      };

      const { error } = await supabase.from("courses").insert(courseData);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Course added successfully",
      });

      fetchCourses();
      handleModalOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add course",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    setIsSubmitting(true);
    try {
      let imageUrl = editingCourse.image;
      if (courseImage) {
        const fileExt = courseImage.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("course-images")
          .upload(fileName, courseImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("course-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;

        const oldImageName = editingCourse.image.split("/").pop();
        if (oldImageName) {
          await supabase.storage.from("course-images").remove([oldImageName]);
        }
      }

      const updatedCourseData = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        level: courseForm.level,
        duration: courseForm.duration,
        required_skills: courseForm.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        topics: courseForm.topics
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        image: imageUrl,
      };

      const { error } = await supabase
        .from("courses")
        .update(updatedCourseData)
        .eq("id", editingCourse.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course updated successfully",
      });

      fetchCourses();
      handleModalOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update course",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });

      fetchCourses();
      handleModalOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
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
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            {/* <h2 className="text-xl font-semibold">Course Management</h2> */}
            <span className="text-md font-semibold">
              You have {courses.length} Courses
            </span>
            {isMobile ? (
              <Drawer open={open} onOpenChange={handleModalOpenChange}>
                <DrawerTrigger asChild>
                  <Button className="bg-breneo-blue hover:bg-breneo-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Course
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <ScrollArea className="h-[80vh]" ref={scrollAreaRef}>
                    <DrawerHeader className="text-left">
                      <DrawerTitle>
                        {editingCourse ? "Edit Course" : "Create a New Course"}
                      </DrawerTitle>
                      <DrawerDescription>
                        {editingCourse
                          ? "Update the details below."
                          : "Fill in the details below to add a new course."}
                      </DrawerDescription>
                    </DrawerHeader>
                    <CourseForm
                      courseForm={courseForm}
                      setCourseForm={setCourseForm}
                      handleImageChange={handleImageChange}
                      imagePreview={imagePreview}
                      className="px-4"
                    />
                  </ScrollArea>
                  <DrawerFooter className="pt-2 sticky bottom-0 bg-background shadow-lg flex-row space-x-2">
                    <Button
                      onClick={handleCourseSubmit}
                      disabled={
                        isSubmitting ||
                        !courseForm.title ||
                        !courseForm.description
                      }
                      className="bg-breneo-blue hover:bg-breneo-blue/90 w-full"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : editingCourse
                        ? "Save Changes"
                        : "Add Course"}
                    </Button>
                    {editingCourse && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the course.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteCourse(editingCourse.id)
                              }
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <DrawerClose asChild>
                      <Button variant="outline" className="w-full">
                        Cancel
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <Dialog open={open} onOpenChange={handleModalOpenChange}>
                <DialogTrigger asChild>
                  <Button className="bg-breneo-blue hover:bg-breneo-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Course
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] bg-gray-50">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800">
                      {editingCourse ? "Edit Course" : "Create a New Course"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCourse
                        ? "Update the details below for your course."
                        : "Fill in the details below to add a new course to your academy."}
                    </DialogDescription>
                  </DialogHeader>
                  <CourseForm
                    courseForm={courseForm}
                    setCourseForm={setCourseForm}
                    handleImageChange={handleImageChange}
                    imagePreview={imagePreview}
                  />
                  <DialogFooter>
                    {editingCourse && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Course
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the course.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteCourse(editingCourse.id)
                              }
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button
                      onClick={handleCourseSubmit}
                      disabled={
                        isSubmitting ||
                        !courseForm.title ||
                        !courseForm.description
                      }
                      className="bg-breneo-blue hover:bg-breneo-blue/90"
                    >
                      {isSubmitting
                        ? "Saving..."
                        : editingCourse
                        ? "Save Changes"
                        : "Add Course"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div>
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground">
                  Add your first course to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-12 w-16 rounded-md object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {course.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{course.level}</Badge>
                      </TableCell>
                      <TableCell>{course.duration}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(course)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AcademyDashboard;
