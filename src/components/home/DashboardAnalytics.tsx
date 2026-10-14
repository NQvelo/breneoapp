import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ApplicationStats {
  applied: number;
  inReview: number;
  interviews: number;
}

export interface DailyPickJob {
  id: string;
  title: string;
  company: string;
  location: string;
  logo?: string;
  matchPercentage?: number;
}

interface DashboardAnalyticsProps {
  applicationStats: ApplicationStats;
  applicationStatsLoading?: boolean;
  dailyPick: DailyPickJob | null;
  dailyPickLoading?: boolean;
}

const sectionClass =
  "flex flex-1 flex-col gap-4 py-6 first:pt-0 last:pb-0 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0";
const sectionTitleClass = "text-base font-bold text-white";
const glassClass =
  "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md";
const dailyPickCardClass = cn(glassClass, "flex items-start gap-3 p-3");
const heroSkeletonClass = "bg-white/20";

const ApplicationStatusSection: React.FC<{
  stats: ApplicationStats;
  isLoading?: boolean;
}> = ({ stats, isLoading }) => {
  const metrics = [
    { label: "Applied", value: stats.applied },
    { label: "In Review", value: stats.inReview },
    { label: "Interviews", value: stats.interviews },
  ];

  return (
    <div className={sectionClass}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={sectionTitleClass}>Application Status</h3>
        <Link
          to="/cv-views"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white/85 transition-colors hover:text-white"
        >
          View History
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className={cn(
              glassClass,
              "flex flex-col items-start gap-1 px-3 py-3",
            )}
          >
            {isLoading ? (
              <Skeleton className={cn(heroSkeletonClass, "h-7 w-8")} />
            ) : (
              <span className="text-2xl font-bold leading-tight text-white">
                {value}
              </span>
            )}
            <span className="text-xs text-white/75">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyPickSection: React.FC<{
  job: DailyPickJob | null;
  isLoading?: boolean;
}> = ({ job, isLoading }) => (
  <div className={sectionClass}>
    <div className="flex items-center gap-2">
      <h3 className={sectionTitleClass}>Daily Pick</h3>
      {/* <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
        <Flame className="h-3 w-3" />
        Hot
      </span> */}
    </div>

    {isLoading ? (
      <div className={cn(dailyPickCardClass, "mt-auto")}>
        <Skeleton className={cn(heroSkeletonClass, "h-10 w-10 rounded-md")} />
        <div className="flex-1 space-y-2">
          <Skeleton className={cn(heroSkeletonClass, "h-4 w-3/4")} />
          <Skeleton className={cn(heroSkeletonClass, "h-3 w-1/2")} />
        </div>
      </div>
    ) : job ? (
      <Link
        to={`/jobs/${encodeURIComponent(job.id)}`}
        className={cn(
          dailyPickCardClass,
          "group mt-auto transition-colors hover:bg-white/20",
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
          {job.logo ? (
            <img
              src={job.logo}
              alt={`${job.company} logo`}
              className="h-10 w-10 object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Briefcase className="h-5 w-5 text-gray-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-bold text-white group-hover:underline">
            {job.title}
          </h4>
          <p className="mt-0.5 truncate text-xs text-white/75">
            {job.company} • {job.location}
          </p>
        </div>
        {job.matchPercentage != null && (
          <span className="flex-shrink-0 rounded-[10px] bg-emerald-400/90 px-2 py-0.5 text-xs font-bold text-emerald-950">
            {Math.round(job.matchPercentage)}% Match
          </span>
        )}
      </Link>
    ) : (
      <div className={cn(dailyPickCardClass, "mt-auto")}>
        <p className="text-xs text-white/80">
          No highlighted job today. Check back soon!
        </p>
      </div>
    )}
  </div>
);

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  applicationStats,
  applicationStatsLoading,
  dailyPick,
  dailyPickLoading,
}) => (
  <section
    className="relative isolate overflow-hidden rounded-3xl p-5 md:p-7"
    style={{ boxShadow: "0 6px 20px 0 rgba(0, 0, 0, 0.04)" }}
  >
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-20"
      style={{
        backgroundImage: "url('/lovable-uploads/breneo-welcome-img.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-slate-900/60 md:bg-transparent md:bg-gradient-to-r md:from-transparent md:via-slate-900/45 md:to-slate-900/75"
    />

    <div className="flex md:justify-end">
      <div className="flex w-full flex-col divide-y divide-white/20 md:w-2/3 md:flex-row md:divide-x md:divide-y-0">
        <ApplicationStatusSection
          stats={applicationStats}
          isLoading={applicationStatsLoading}
        />
        <DailyPickSection job={dailyPick} isLoading={dailyPickLoading} />
      </div>
    </div>
  </section>
);

export default DashboardAnalytics;
