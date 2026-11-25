import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { useEnrolledCourses } from "@/hooks/useEnrolledCourses";
import { useMyApplications } from "@/hooks/useMyApplications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { toast } from "sonner";
import { Bookmark } from "@/components/icons";
import { cn } from "@/lib/utils";
import { CompanyNameLink } from "@/components/jobs/CompanyNameLink";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import {
  jobIdFromApplication,
  type JobApplicationItem,
} from "@/api/jobs/jobApplicationsApi";
import {
  Briefcase,
  GraduationCap,
  Loader2,
  MapPin,
} from "@/components/icons";

export type AppliedTab = "courses" | "jobs";

interface ProfileAppliedViewProps {
  activeTab: AppliedTab;
}

function formatAppliedDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function jobLogoFromApplication(item: JobApplicationItem): string | undefined {
  const job = item.job;
  if (!job || typeof job !== "object") return undefined;
  const candidates = [job.logo, job.logo_upload, job.company_logo];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return undefined;
}

export function ProfileAppliedView({ activeTab }: ProfileAppliedViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const t = useTranslation();

  const enabled = Boolean(user?.id);
  const { data: enrolledCourses = [], isLoading: loadingCourses } =
    useEnrolledCourses(enabled && activeTab === "courses", user?.id);
  const { data: myApps, isLoading: loadingJobs } = useMyApplications(
    enabled && activeTab === "jobs",
  );
  const appliedJobs = myApps?.applications ?? [];
  const queryClient = useQueryClient();
  const { data: savedCourseIds = [] } = useQuery<string[]>({
    queryKey: ["savedCourseIds", user?.id],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      const data = response.data;
      const ids =
        data && typeof data === "object"
          ? (data as { saved_courses?: unknown[] }).saved_courses
          : undefined;
      return Array.isArray(ids)
        ? ids.map((id) => String(id))
        : [];
    },
    enabled: enabled && activeTab === "courses",
  });
  const saveCourseMutation = useMutation({
    mutationFn: (courseId: string) =>
      apiClient.post(`/api/save-course/${courseId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedCourseIds", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["savedCourses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Course saved status updated.");
    },
  });

  if (activeTab === "courses") {
    return (
      <div className="space-y-3">
        <h2 className="px-1 text-xl font-bold text-gray-900 dark:text-gray-100">
          Applied Courses
        </h2>
        <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
          {loadingCourses ? (
            <LoadingState />
          ) : enrolledCourses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No applied courses"
              description="Enroll in a course to see it here."
              actionLabel="Browse Courses"
              onAction={() => navigate("/courses")}
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="group cursor-pointer transition-colors"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <CourseRow
                    course={course}
                    isMobile={isMobile}
                    enrolledLabel={t.courses.enrolled}
                    isSaved={savedCourseIds.includes(String(course.id))}
                    onSave={(event) => {
                      event.stopPropagation();
                      saveCourseMutation.mutate(String(course.id));
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="px-1 text-xl font-bold text-gray-900 dark:text-gray-100">
        Applied Jobs
      </h2>
      <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
        {loadingJobs ? (
          <LoadingState />
        ) : appliedJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applied jobs"
            description="Jobs you apply to will show up here."
            actionLabel="Browse Jobs"
            onAction={() => navigate("/jobs")}
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {appliedJobs.map((item) => {
              const jobId = jobIdFromApplication(item);
              const job = item.job;
              const title =
                (job?.title && String(job.title)) || "Job application";
              const company =
                (job?.company_name && String(job.company_name)) || "";
              const location = (job?.location && String(job.location)) || "";
              const logo = jobLogoFromApplication(item);
              const when = formatAppliedDate(
                typeof item.applied_at === "string" ? item.applied_at : undefined,
              );
              const employerViewedCv = item.employer_viewed_cv === true;
              const employerCvViewCount =
                typeof item.employer_cv_view_count === "number"
                  ? item.employer_cv_view_count
                  : undefined;

              return (
                <div
                  key={`${jobId}-${String(item.applied_at ?? "")}`}
                  className="group cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                  onClick={() => {
                    if (jobId) navigate(`/jobs/${encodeURIComponent(jobId)}`);
                  }}
                >
                  <JobRow
                    title={title}
                    company={company}
                    location={location}
                    logo={logo}
                    when={when}
                    employerViewedCv={employerViewedCv}
                    employerCvViewCount={employerCvViewCount}
                    isMobile={isMobile}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col justify-center items-center py-20 bg-white/50 dark:bg-[#242424]/50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
      <p className="text-sm text-gray-500 font-medium">Loading...</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="p-12 text-center bg-card/50">
      <Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      <Button onClick={onAction} variant="default">
        {actionLabel}
      </Button>
    </div>
  );
}

function CourseRow({
  course,
  isMobile,
  enrolledLabel,
  isSaved,
  onSave,
}: {
  course: {
    id: string;
    title: string;
    provider: string;
    academyId?: string;
    academyLogo?: string;
    level: string;
    duration: string;
    image: string;
    category: string;
  };
  isMobile: boolean;
  enrolledLabel: string;
  isSaved: boolean;
  onSave: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <CardContent className="rounded-3xl border border-gray-200 dark:border-gray-700 p-0 overflow-hidden bg-white dark:bg-[#242424] h-full">
      <div className="relative aspect-[2.58/1] w-full overflow-hidden">
        <img
          src={course.image || "/lovable-uploads/no_photo.png"}
          alt={course.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "/lovable-uploads/no_photo.png";
          }}
        />
      </div>
      <div className="p-3 flex flex-col min-h-[112px]">
        <h3 className="font-semibold text-base mb-2 line-clamp-2">
          {course.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white text-xs font-semibold text-muted-foreground">
              {course.academyLogo ? (
                <img
                  src={course.academyLogo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (course.provider.trim().charAt(0).toUpperCase() || "A")
              )}
            </div>
            <span className="truncate text-sm font-medium">
              {course.provider || "Academy"}
            </span>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={onSave}
            aria-label={isSaved ? "Unsave course" : "Save course"}
            className={cn(
              "h-10 w-10 flex-shrink-0",
              isSaved
                ? "text-breneo-blue bg-breneo-blue/10"
                : "text-black dark:text-white",
            )}
          >
            <Bookmark
              className={cn(
                "h-4 w-4",
                isSaved ? "fill-breneo-blue text-breneo-blue" : "",
              )}
            />
          </Button>
        </div>
      </div>
    </CardContent>
  );
}

function JobRow({
  title,
  company,
  location,
  logo,
  when,
  employerViewedCv,
  employerCvViewCount,
  isMobile,
}: {
  title: string;
  company: string;
  location: string;
  logo?: string;
  when: string | null;
  employerViewedCv: boolean;
  employerCvViewCount?: number;
  isMobile: boolean;
}) {
  const cvLabel =
    employerViewedCv
      ? `CV view: ${Math.max(employerCvViewCount ?? 1, 1)}`
      : "No view";

  return (
    <div className={isMobile ? "px-5 pt-5 pb-4 flex flex-col flex-grow" : "p-0"}>
      {isMobile ? (
        <>
          <div className="flex items-start gap-3 mb-3">
            <CompanyLogo
              src={logo}
              companyName={company}
              className="h-10 w-10"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm min-w-0">
                <CompanyNameLink name={company} className="font-semibold text-sm" />
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 truncate">{location}</p>
            </div>
          </div>

          <h4 className="font-bold text-base mb-2 line-clamp-2 leading-6">
            {title}
          </h4>

          <div className="mt-5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
            {when ? (
              <span className="rounded-[10px] bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Applied: {when}
              </span>
            ) : null}
            <span className={cn(
              "rounded-[10px] px-3 py-1.5 text-[13px] font-medium",
              employerViewedCv
                ? "bg-breneo-blue/10 text-breneo-blue"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
            )}>
              {cvLabel}
            </span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start gap-4">
            <CompanyLogo
              src={logo}
              companyName={company}
              className="h-12 w-12"
            />
              <div className="flex-1 min-w-0">
                <div className="mb-1 md:mb-2">
                  <h3 className="font-normal text-sm text-gray-600 mb-1 min-w-0">
                    <CompanyNameLink name={company} className="font-normal text-sm text-gray-600" />
                  </h3>
                  <h4 className="font-bold text-base md:text-lg mb-1 md:mb-2 line-clamp-2 md:line-clamp-3">
                    {title}
                  </h4>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 py-4 pr-6 flex flex-col items-end justify-center gap-2">
            {when ? (
              <span className="rounded-[10px] bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Applied: {when}
              </span>
            ) : null}
            <span className={cn(
              "rounded-[10px] px-3 py-1.5 text-[13px] font-medium",
              employerViewedCv
                ? "bg-breneo-blue/10 text-breneo-blue"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
            )}>
              {cvLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
