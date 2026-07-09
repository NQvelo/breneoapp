import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { useEnrolledCourses } from "@/hooks/useEnrolledCourses";
import { useMyApplications } from "@/hooks/useMyApplications";
import {
  jobIdFromApplication,
  type JobApplicationItem,
} from "@/api/jobs/jobApplicationsApi";
import { PLATFORM_CHIP_BADGE_CLASS } from "@/lib/chipStyles";
import {
  Briefcase,
  GraduationCap,
  Loader2,
  MapPin,
  Calendar,
} from "lucide-react";

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

  if (activeTab === "courses") {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Applied Courses
          </h2>
        </div>
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
                className="group cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <CourseRow
                  course={course}
                  isMobile={isMobile}
                  enrolledLabel={t.courses.enrolled}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-[#242424] overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Applied Jobs
        </h2>
      </div>
      {loadingJobs ? (
        <LoadingState />
      ) : appliedJobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applied jobs"
          description="Apply to employer jobs in Breneo to see them here."
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
                />
              </div>
            );
          })}
        </div>
      )}
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
}: {
  course: {
    id: string;
    title: string;
    provider: string;
    level: string;
    duration: string;
    image: string;
    category: string;
  };
  isMobile: boolean;
  enrolledLabel: string;
}) {
  return (
    <div
      className={
        isMobile
          ? "px-5 pt-5 pb-4 flex flex-col"
          : "p-4 md:p-5 flex items-center gap-4"
      }
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-breneo-blue/10">
        {course.image ? (
          <img
            src={course.image}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/lovable-uploads/no_photo.png";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-breneo-blue" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 mt-3 md:mt-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {course.provider || "Course provider"}
        </p>
        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 line-clamp-2 mt-0.5">
          {course.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className={PLATFORM_CHIP_BADGE_CLASS}>
            {enrolledLabel}
          </Badge>
          {course.level ? (
            <Badge className={PLATFORM_CHIP_BADGE_CLASS}>
              {course.level}
            </Badge>
          ) : null}
          {course.duration ? (
            <Badge className={PLATFORM_CHIP_BADGE_CLASS}>
              {course.duration}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
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
}: {
  title: string;
  company: string;
  location: string;
  logo?: string;
  when: string | null;
  employerViewedCv: boolean;
  employerCvViewCount?: number;
}) {
  const viewCount = employerViewedCv
    ? Math.max(employerCvViewCount ?? 1, 1)
    : 0;

  return (
    <div className="px-5 pt-5 pb-4 md:p-5 flex items-start gap-3 md:gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-breneo-accent flex items-center justify-center">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Briefcase className="h-6 w-6 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {company || "Company"}
        </p>
        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 line-clamp-2 mt-0.5">
          {title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {location}
            </span>
          ) : null}
          {when ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {when}
            </span>
          ) : null}
          {employerViewedCv ? (
            <span className="text-breneo-blue dark:text-sky-300">
              Employer viewed your application {viewCount}{" "}
              {viewCount === 1 ? "time" : "times"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
