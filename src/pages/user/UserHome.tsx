import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bookmark,
  MoreVertical,
  ChevronRight,
  Clock,
  ChevronLeft,
} from "lucide-react";

// API Job structure from JSearch
interface ApiJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link?: string;
  employer_logo?: string;
}

// Transformed Job for UI
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  date: string;
  logo?: string;
  salary?: string;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  image: string;
}

interface Webinar {
  id: string;
  title: string;
  company: string;
  time: string;
  date: string;
  logo?: string;
}

const JSEARCH_API_KEY = "f438e914d7msh480f4890d34c417p1f564ajsnce17947c5ab2";

// Fetch jobs from JSearch API
const fetchJobs = async () => {
  const params = new URLSearchParams({
    query: "developer",
    page: "1",
    num_pages: "1",
  });

  const API_ENDPOINT = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

  const response = await fetch(API_ENDPOINT, {
    method: "GET",
    headers: {
      "X-Rapidapi-Key": JSEARCH_API_KEY,
      "X-Rapidapi-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const result = await response.json();
  return result.data || [];
};

const UserHome = () => {
  const { user } = useAuth();
  const [currentJobPage, setCurrentJobPage] = useState(0);

  // Fetch jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["home-jobs"],
    queryFn: fetchJobs,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Mock webinars data (since we don't have a webinars table yet)
  const mockWebinars: Webinar[] = [
    {
      id: "1",
      title: "Career Growth Strategies",
      company: "Breneo Academy",
      time: "14:00 - 15:00",
      date: "15 Dec",
    },
    {
      id: "2",
      title: "Tech Skills Workshop",
      company: "Tech Experts",
      time: "16:00 - 17:00",
      date: "15 Dec",
    },
    {
      id: "3",
      title: "Digital Marketing Bootcamp",
      company: "Marketing Pro",
      time: "18:00 - 19:00",
      date: "15 Dec",
    },
  ];

  // Transform jobs
  const transformedJobs: Job[] = jobs.slice(0, 6).map((job: ApiJob) => {
    const location = [job.job_city, job.job_state, job.job_country]
      .filter(Boolean)
      .join(", ");

    return {
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location,
      logo: job.employer_logo,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  });

  // Get current page jobs (3 per page)
  const currentJobs = transformedJobs.slice(
    currentJobPage * 3,
    currentJobPage * 3 + 3
  );

  const canGoNext = currentJobPage < Math.ceil(transformedJobs.length / 3) - 1;
  const canGoPrev = currentJobPage > 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Top Jobs and Courses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Job Picks Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Top job picks for you
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentJobPage((p) => Math.max(0, p - 1))}
                    disabled={!canGoPrev}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentJobPage((p) => p + 1)}
                    disabled={!canGoNext}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {jobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="relative hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="absolute top-4 left-4">
                          <Bookmark className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="absolute top-4 right-4">
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="mt-8 mb-3">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            ${Math.floor(Math.random() * 200 + 200)}/hr
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {job.logo ? (
                            <img
                              src={job.logo}
                              alt={job.company}
                              className="w-8 h-8 rounded-full object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-breneo-blue/10 flex items-center justify-center">
                              <span className="text-breneo-blue font-semibold text-xs">
                                {job.company.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-600">
                            {job.company}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">{job.date}</p>

                        <div className="flex justify-end mt-4">
                          <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Top Courses Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Top courses picked for you
              </h2>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative">
                      <CardContent className="p-4">
                        <Skeleton className="h-32 w-full mb-3" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.slice(0, 3).map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`}>
                      <Card className="relative hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img
                              src={course.image}
                              alt={course.title}
                              className="w-full h-32 object-cover rounded-t-lg"
                            />
                            <div className="absolute top-4 right-4">
                              <Bookmark className="h-5 w-5 text-white drop-shadow-md" />
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="absolute top-4 right-4 opacity-0 pointer-events-none">
                              <MoreVertical className="h-5 w-5 text-gray-400" />
                            </div>

                            <h3 className="font-semibold text-base mb-2 line-clamp-2">
                              {course.title}
                            </h3>

                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-gray-500">
                                {course.provider}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 mb-3">
                              {course.duration} · {course.level}
                            </p>

                            <div className="flex justify-end mt-4">
                              <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Webinars */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-white">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Webinars
                  </h2>

                  {/* Calendar/Date Picker */}
                  <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
                    {[
                      { day: "Sun", date: "01" },
                      { day: "Mon", date: "02" },
                      { day: "Tue", date: "03" },
                      { day: "Wed", date: "04" },
                      { day: "Thu", date: "05" },
                      { day: "Fri", date: "06" },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          idx === 0
                            ? "bg-breneo-blue text-white"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>{item.day}</span>
                        <span className="text-sm mt-1">{item.date}</span>
                      </button>
                    ))}
                  </div>

                  {/* Webinar List */}
                  <div className="space-y-4">
                    {mockWebinars.map((webinar) => (
                      <div
                        key={webinar.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-breneo-blue/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-breneo-blue font-semibold text-sm">
                            {webinar.company.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {webinar.title}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{webinar.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserHome;
