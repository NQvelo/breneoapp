import React from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CoursePage = () => {
  const { courseId } = useParams();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("Error fetching course details:", error);
        return null;
      }
      return data;
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="p-8">Course not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <img
              src={course.image}
              alt={course.title}
              className="w-full h-64 object-cover mb-4 rounded-md"
            />
            <CardTitle className="text-3xl font-bold">{course.title}</CardTitle>
            <div className="flex items-center gap-4 text-md text-gray-600 pt-2">
              <span>Provider: {course.provider}</span>
              <span>Level: {course.level}</span>
              <span>Duration: {course.duration}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{course.description}</p>
            <div className="mb-6">
              <h3 className="font-semibold text-xl mb-2">Topics Covered</h3>
              <div className="flex flex-wrap gap-2">
                {course.topics.map((topic) => (
                  <Badge key={topic}>{topic}</Badge>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="font-semibold text-xl mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {course.required_skills.map((skill) => (
                  <Badge variant="secondary" key={skill}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <Button size="lg">Enroll Now</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CoursePage;
