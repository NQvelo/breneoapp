import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Clock,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

const AcademyDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [academyProfile, setAcademyProfile] = useState<AcademyProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "",
    duration: "",
    required_skills: "",
    topics: "",
    image: "",
  });

  useEffect(() => {
    if (user) {
      fetchAcademyData();
    }
  }, [user]);

  useEffect(() => {
    if (academyProfile) {
      fetchCourses();
    }
  }, [academyProfile]);

  const fetchAcademyData = async () => {
    try {
      const { data, error } = await supabase
        .from("academy_profiles")
        .select("*")
        .eq("user_id", user?.id)
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
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("academy_id", academyProfile?.id)
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
  };

  const handleAddCourse = async () => {
    if (!academyProfile) return;

    setIsAddingCourse(true);
    try {
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
        image:
          courseForm.image ||
          "/lovable-uploads/6bee4aa6-3a7f-4806-98bd-dc73a1955812.png",
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

      setCourseForm({
        title: "",
        description: "",
        category: "",
        level: "",
        duration: "",
        required_skills: "",
        topics: "",
        image: "",
      });

      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add course",
        variant: "destructive",
      });
    } finally {
      setIsAddingCourse(false);
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
        {/* Academy Profile Header */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {academyProfile.logo_url ? (
                <img
                  src={academyProfile.logo_url}
                  alt={`${academyProfile.academy_name} logo`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-breneo-blue rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {academyProfile.academy_name}
                </h1>
                <p className="text-muted-foreground">
                  {academyProfile.description}
                </p>
                <div className="flex items-center mt-2 space-x-4">
                  {academyProfile.is_verified && (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      ✓ Verified
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {courses.length} Courses
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Management */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Course Management</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-breneo-blue hover:bg-breneo-blue/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                  <DialogDescription>
                    Create a new course for your academy
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={courseForm.title}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, title: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Category
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setCourseForm({ ...courseForm, category: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="programming">Programming</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="data-science">
                          Data Science
                        </SelectItem>
                        <SelectItem value="cybersecurity">
                          Cybersecurity
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="level" className="text-right">
                      Level
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setCourseForm({ ...courseForm, level: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
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
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="duration" className="text-right">
                      Duration
                    </Label>
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
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="skills" className="text-right">
                      Required Skills
                    </Label>
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
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="topics" className="text-right">
                      Topics
                    </Label>
                    <Input
                      id="topics"
                      placeholder="Comma separated topics"
                      value={courseForm.topics}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, topics: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="image" className="text-right">
                      Image URL
                    </Label>
                    <Input
                      id="image"
                      placeholder="Optional image URL"
                      value={courseForm.image}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, image: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddCourse}
                    disabled={
                      isAddingCourse ||
                      !courseForm.title ||
                      !courseForm.description
                    }
                    className="bg-breneo-blue hover:bg-breneo-blue/90"
                  >
                    {isAddingCourse ? "Adding..." : "Add Course"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Courses List */}
          <div className="grid gap-4">
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground">
                  Add your first course to get started
                </p>
              </div>
            ) : (
              courses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold truncate">
                            {course.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{course.level}</Badge>
                            <Badge variant="outline">{course.category}</Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 text-sm md:text-base">
                          {course.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 shrink-0" />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 shrink-0" />
                            <span>{course.topics.length} topics</span>
                          </div>
                        </div>
                        {course.required_skills.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-sm font-medium">
                              Required Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {course.required_skills.map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 lg:flex-col lg:gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 lg:flex-none"
                        >
                          <Edit className="w-4 h-4 mr-2 lg:mr-0" />
                          <span className="lg:hidden">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-600 hover:text-red-700 flex-1 lg:flex-none"
                        >
                          <Trash2 className="w-4 h-4 mr-2 lg:mr-0" />
                          <span className="lg:hidden">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AcademyDashboard;
