<<<<<<< HEAD

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateSkillScores, getTopSkills } from '@/utils/skillTestUtils';
import { useQuery } from '@tanstack/react-query';

=======
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateSkillScores, getTopSkills } from "@/utils/skillTestUtils";
import { useQuery } from "@tanstack/react-query";
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  match: number;
  enrolled: boolean;
  popular: boolean;
  image: string;
  description: string;
  topics: string[];
  required_skills: string[];
}
<<<<<<< HEAD

const CoursesPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
=======
const CoursesPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
  const [coursesWithMatches, setCoursesWithMatches] = useState<Course[]>([]);

  // Fetch courses from database
  const { data: courses, isLoading: coursesLoading } = useQuery({
<<<<<<< HEAD
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }

      return data?.map(course => ({
        ...course,
        match: 0, // Will be calculated based on user skills
        topics: course.topics || [],
        required_skills: course.required_skills || []
      })) || [];
    }
=======
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return (
        data?.map((course) => ({
          ...course,
          match: 0,
          // Will be calculated based on user skills
          topics: course.topics || [],
          required_skills: course.required_skills || [],
        })) || []
      );
    },
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
  });

  // Fetch user's skill test results
  const { data: userSkills, isLoading: skillsLoading } = useQuery({
<<<<<<< HEAD
    queryKey: ['userSkills', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: answers, error } = await supabase
        .from('usertestanswers')
        .select('*')
        .eq('userid', user.id);

      if (error || !answers || answers.length === 0) {
        return [];
      }

      const skillScores = calculateSkillScores(answers);
      const topSkills = getTopSkills(skillScores, 10);
      
      return topSkills.map(skill => skill.skill);
    },
    enabled: !!user
=======
    queryKey: ["userSkills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: answers, error } = await supabase
        .from("usertestanswers")
        .select("*")
        .eq("userid", user.id);
      if (error || !answers || answers.length === 0) {
        return [];
      }
      const skillScores = calculateSkillScores(answers);
      const topSkills = getTopSkills(skillScores, 10);
      return topSkills.map((skill) => skill.skill);
    },
    enabled: !!user,
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
  });

  // Calculate course matches based on user skills
  useEffect(() => {
    if (!courses || courses.length === 0) {
      setCoursesWithMatches([]);
      return;
    }
<<<<<<< HEAD

=======
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
    if (!userSkills || userSkills.length === 0) {
      setCoursesWithMatches(courses);
      return;
    }
<<<<<<< HEAD

    const coursesWithCalculatedMatches = courses.map(course => {
      // Calculate match percentage based on skill overlap
      const matchingSkills = course.required_skills.filter(skill => 
        userSkills.some(userSkill => 
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      
      const matchPercentage = course.required_skills.length > 0 
        ? Math.round((matchingSkills.length / course.required_skills.length) * 100)
        : 50; // Default match for courses without specific skill requirements

      return {
        ...course,
        match: Math.max(matchPercentage, 25) // Minimum 25% match for variety
=======
    const coursesWithCalculatedMatches = courses.map((course) => {
      // Calculate match percentage based on skill overlap
      const matchingSkills = course.required_skills.filter((skill) =>
        userSkills.some(
          (userSkill) =>
            userSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      const matchPercentage =
        course.required_skills.length > 0
          ? Math.round(
              (matchingSkills.length / course.required_skills.length) * 100
            )
          : 50; // Default match for courses without specific skill requirements

      return {
        ...course,
        match: Math.max(matchPercentage, 25), // Minimum 25% match for variety
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
      };
    });

    // Sort by match percentage (highest first)
<<<<<<< HEAD
    const sortedCourses = coursesWithCalculatedMatches.sort((a, b) => b.match - a.match);
    setCoursesWithMatches(sortedCourses);
  }, [userSkills, courses]);
  
  // Filter courses based on search and tab
  const filteredCourses = coursesWithMatches.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentTab === 'all') return matchesSearch;
    if (currentTab === 'enrolled') return matchesSearch && course.enrolled;
    if (currentTab === 'recommended') return matchesSearch && course.match > 70;
    
    return false;
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-breneo-navy">Learning Paths</h1>
          {(skillsLoading || coursesLoading) && (
            <div className="text-sm text-gray-500">Loading courses...</div>
          )}
          {userSkills && userSkills.length > 0 && (
            <div className="text-sm text-gray-600">
              Personalized based on your skills: {userSkills.slice(0, 3).join(', ')}
            </div>
          )}
        </div>
        
=======
    const sortedCourses = coursesWithCalculatedMatches.sort(
      (a, b) => b.match - a.match
    );
    setCoursesWithMatches(sortedCourses);
  }, [userSkills, courses]);

  // Filter courses based on search and tab
  const filteredCourses = coursesWithMatches.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase());
    if (currentTab === "all") return matchesSearch;
    if (currentTab === "enrolled") return matchesSearch && course.enrolled;
    if (currentTab === "recommended") return matchesSearch && course.match > 70;
    return false;
  });
  return (
    <DashboardLayout>
      <div className="p-6">
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
        <div className="mb-6">
          <Input
            placeholder="Search courses by title, provider, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-2xl"
          />
        </div>
<<<<<<< HEAD
        
        <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Courses ({coursesWithMatches.length})</TabsTrigger>
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="recommended">
              Recommended ({coursesWithMatches.filter(c => c.match > 70).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
=======

        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
            <TabsTrigger value="all" className="text-xs md:text-sm">
              <span className="hidden sm:inline">All Courses</span>
              <span className="sm:hidden">All</span>
              <span className="ml-1">({coursesWithMatches.length})</span>
            </TabsTrigger>
            <TabsTrigger value="enrolled" className="text-xs md:text-sm">
              <span className="hidden sm:inline">My Courses</span>
              <span className="sm:hidden">Mine</span>
            </TabsTrigger>
            <TabsTrigger value="recommended" className="text-xs md:text-sm">
              <span className="hidden sm:inline">Recommended</span>
              <span className="sm:hidden">Top</span>
              <span className="ml-1">
                ({coursesWithMatches.filter((c) => c.match > 70).length})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-500">Loading courses...</div>
            </div>
          ) : filteredCourses.length > 0 ? (
<<<<<<< HEAD
            filteredCourses.map(course => (
              <Card key={course.id} className="overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title} 
=======
            filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{course.title}</h3>
                    {course.popular && (
<<<<<<< HEAD
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
=======
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      >
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                        Popular
                      </Badge>
                    )}
                  </div>
<<<<<<< HEAD
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Link 
=======

                  <div className="flex items-center gap-2 mb-3">
                    <Link
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                      to={`/academy/${encodeURIComponent(course.provider)}`}
                      className="text-gray-500 text-sm hover:text-breneo-blue hover:underline cursor-pointer"
                    >
                      {course.provider}
                    </Link>
                    <span className="text-gray-400">•</span>
<<<<<<< HEAD
                    <span className="text-gray-500 text-sm">{course.level}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">{course.duration}</span>
                  </div>
                  
                  <p className="text-gray-700 text-sm mb-3">{course.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {course.topics.slice(0, 3).map((topic, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
=======
                    <span className="text-gray-500 text-sm">
                      {course.level}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">
                      {course.duration}
                    </span>
                  </div>

                  <p className="text-gray-700 text-sm mb-3">
                    {course.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {course.topics.slice(0, 3).map((topic, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                        >
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                          {topic}
                        </span>
                      ))}
                      {course.topics.length > 3 && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          +{course.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
<<<<<<< HEAD
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      course.match >= 80 ? 'bg-green-100 text-green-800' :
                      course.match >= 60 ? 'bg-blue-100 text-blue-800' :
                      course.match >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {course.match}% Match
                    </span>
                    <Button size="sm" variant={course.enrolled ? "outline" : "default"} className={course.enrolled ? "" : "bg-breneo-blue hover:bg-breneo-blue/90"}>
                      {course.enrolled ? 'Continue' : 'Enroll'}
=======

                  <div className="flex justify-between items-center">
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${
                        course.match >= 80
                          ? "bg-green-100 text-green-800"
                          : course.match >= 60
                          ? "bg-blue-100 text-blue-800"
                          : course.match >= 40
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {course.match}% Match
                    </span>
                    <Button
                      size="sm"
                      variant={course.enrolled ? "outline" : "default"}
                      className={
                        course.enrolled
                          ? ""
                          : "bg-breneo-blue hover:bg-breneo-blue/90"
                      }
                    >
                      {course.enrolled ? "Continue" : "Enroll"}
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border">
<<<<<<< HEAD
              <p className="text-gray-500 mb-4">No courses found matching your criteria</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setCurrentTab('all');
=======
              <p className="text-gray-500 mb-4">
                No courses found matching your criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentTab("all");
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
                }}
              >
                Reset Search
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
<<<<<<< HEAD

=======
>>>>>>> b2de839eb07d4851272ea692cd669a25bbaff333
export default CoursesPage;
