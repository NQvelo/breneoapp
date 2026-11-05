import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Factory,
  Globe,
  Loader2,
  MapPin,
  Users,
} from "@/components/icons";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadialProgress } from "@/components/ui/radial-progress";
import { JobListingMetaBadges } from "@/components/jobs/JobListingMetaBadges";
import { useMobile } from "@/hooks/use-mobile";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getJobAggregatorClient } from "@/api/httpClients";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { fetchActiveJobs, type ApiJob } from "@/api/jobs";
import type { JobDetail, JobFilters } from "@/api/jobs/types";
import { profileApi } from "@/api/profile";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatJobSalaryDisplay } from "@/utils/jobSalaryFormat";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";
import { getMatchQualityLabel } from "@/utils/jobMatchUtils";
import {
  buildUserMatchProfileFromSkillTest,
  matchJobDetailToUser,
  normalizeSkillName,
} from "@/services/matching";
import { decodeCompanyParam } from "@/utils/companyPagePath";

type PublicCompany = {
  name: string;
  description: string;
  logo: string;
  website: string;
  foundedYear: string;
  employees: string;
  industries: string[];
  headquarters: string;
};

type CompanyJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  employmentType: string;
  workArrangement: string;
  logo?: string;
  country: string;
  postedAt: number;
  isSaved: boolean;
  matchPercentage?: number;
};

const companyImageShadow =
  "shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_22px_-6px_rgba(15,23,42,0.18)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_28px_-8px_rgba(0,0,0,0.55)]";

const EMPTY_FILTERS: JobFilters = {
  country: "",
  countries: [],
  jobTypes: [],
  isRemote: false,
  skills: [],
};

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function httpUrl(value: unknown): string {
  const raw = readString(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes(".") && !raw.includes(" ")) return `https://${raw}`;
  return "";
}

function foundedYear(value: unknown): string {
  const raw = readString(value);
  const match = raw.match(/^(\d{4})/);
  return match?.[1] ?? "";
}

function employeesLabel(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value.toLocaleString()} employees`;
  }
  const raw = readString(value);
  if (!raw || raw === "null" || raw === "0") return "";
  if (/employee/i.test(raw)) return raw;
  return `${raw} employees`;
}

function industryLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      labels.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const name = readString((item as { name?: unknown }).name);
      if (name) labels.push(name);
    }
  }
  return labels;
}

function extraAbout(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const key of ["about", "description", "overview", "summary", "text"]) {
    const text = readString(record[key]);
    if (text) return text;
  }
  return "";
}

function logoUrl(record: Record<string, unknown>): string {
  for (const key of ["logo_upload", "logo", "company_logo", "logo_url"]) {
    const url = httpUrl(record[key]);
    if (url) return url;
  }
  return "";
}

function unwrapCompany(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (readString(record.name) || readString(record.company_name)) return record;
  for (const key of ["company", "data", "result"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }
  return record;
}

async function fetchPublicCompany(name: string): Promise<PublicCompany | null> {
  const response = await getJobAggregatorClient().fetch(
    `/api/companies/${encodeURIComponent(name)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) return null;
  const record = unwrapCompany(await response.json());
  if (!record) return null;

  const description =
    readString(record.description) ||
    readString(record.company_description) ||
    extraAbout(record.additional_details);

  return {
    name: readString(record.name) || readString(record.company_name) || name,
    description,
    logo: logoUrl(record),
    website: httpUrl(record.website) || httpUrl(record.domain),
    foundedYear: foundedYear(record.founded_date ?? record.founded),
    employees: employeesLabel(
      record.employees_count ?? record.company_size ?? record.size,
    ),
    industries: industryLabels(record.industries),
    headquarters: readString(
      record.headquarters ?? record.company_headquarters ?? record.location,
    ),
  };
}

function jobCompanyName(job: ApiJob): string {
  const companyObj =
    job.company && typeof job.company === "object"
      ? (job.company as Record<string, unknown>)
      : null;
  return (
    readString(companyObj?.name) ||
    readString(companyObj?.company_name) ||
    readString(job.company_name) ||
    readString(job.companyName) ||
    readString(job.employer_name) ||
    (typeof job.company === "string" ? job.company.trim() : "")
  );
}

function jobCountry(job: ApiJob): string {
  const record = job as Record<string, unknown>;
  const country =
    readString(record.location_country) ||
    readString(job.job_country) ||
    readString(record.country);
  if (!country || /^(unknown|n\/a|none|not specified)$/i.test(country)) {
    return "";
  }
  return country;
}

function jobPostedAt(job: ApiJob): number {
  const record = job as Record<string, unknown>;
  const raw =
    readString(record.posted_at) ||
    readString(job.date_posted) ||
    readString(job.posted_date) ||
    readString(record.fetched_at) ||
    readString(record.job_posted_at_datetime_utc);
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function sameCompany(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

function toCompanyJob(job: ApiJob): CompanyJob | null {
  const id = readString(job.job_id) || readString(job.id);
  if (!id) return null;
  const location =
    readString(job.location) ||
    readString(job.jobLocation) ||
    [job.job_city, job.job_state, job.job_country, job.city, job.country]
      .map((part) => readString(part))
      .filter(Boolean)
      .join(", ") ||
    "Location not specified";

  const logo =
    httpUrl(job.company_logo) ||
    httpUrl(job.companyLogo) ||
    httpUrl(job.employer_logo) ||
    httpUrl(job.logo_upload) ||
    httpUrl(job.logo);

  return {
    id,
    title:
      readString(job.job_title) || readString(job.title) || "Untitled role",
    company: jobCompanyName(job) || "Company",
    location,
    salary: formatJobSalaryDisplay(job),
    employmentType: resolveJobEmploymentType(job),
    workArrangement: resolveJobWorkArrangement(job),
    logo: logo || undefined,
    country: jobCountry(job),
    postedAt: jobPostedAt(job),
    isSaved: false,
  };
}

function splitCompanyJobs(jobs: CompanyJob[]): {
  top: CompanyJob[];
  rest: CompanyJob[];
} {
  const ranked = [...jobs].sort((a, b) => {
    const matchDiff = (b.matchPercentage ?? -1) - (a.matchPercentage ?? -1);
    if (matchDiff !== 0) return matchDiff;
    return b.postedAt - a.postedAt;
  });
  const top = ranked.slice(0, Math.min(3, ranked.length));
  const topIds = new Set(top.map((job) => job.id));
  const rest = jobs
    .filter((job) => !topIds.has(job.id))
    .sort((a, b) => {
      const matchDiff = (b.matchPercentage ?? -1) - (a.matchPercentage ?? -1);
      if (matchDiff !== 0) return matchDiff;
      return b.postedAt - a.postedAt;
    });
  return { top, rest };
}

const CompanyPage = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const requestedName = companyName
    ? decodeCompanyParam(companyName).trim()
    : "";
  const [page, setPage] = useState(1);
  const [listedJobs, setListedJobs] = useState<ApiJob[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setPage(1);
    setListedJobs([]);
    setHasMore(false);
    setLogoFailed(false);
  }, [requestedName]);

  const companyQuery = useQuery({
    queryKey: ["publicCompany", requestedName],
    queryFn: () => fetchPublicCompany(requestedName),
    enabled: !!requestedName,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ["companyOpenJobs", requestedName, page],
    queryFn: () =>
      fetchActiveJobs({
        query: "",
        filters: { ...EMPTY_FILTERS, company: [requestedName] },
        page,
        pageSize: 20,
      }),
    enabled: !!requestedName,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const data = jobsQuery.data;
    if (!data) return;
    if (data.page != null && data.page !== page) return;

    const matched = data.jobs.filter((job) =>
      sameCompany(jobCompanyName(job), requestedName),
    );
    const next = matched.filter(
      (job) => readString(job.job_id) || readString(job.id),
    );

    setListedJobs((current) => {
      if (page === 1) return next;
      const seen = new Set(
        current.map((job) => readString(job.job_id) || readString(job.id)),
      );
      return [
        ...current,
        ...next.filter(
          (job) => !seen.has(readString(job.job_id) || readString(job.id)),
        ),
      ];
    });
    setHasMore(Boolean(data.hasMore) && matched.length > 0);
  }, [jobsQuery.data, page, requestedName]);

  const { data: savedJobIds = [] } = useQuery<string[]>({
    queryKey: ["savedJobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const profileResponse = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
        const saved = profileResponse.data?.saved_jobs || [];
        return saved.map((id: string | number) => String(id));
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: profileSkills = [] } = useQuery({
    queryKey: ["profileSkills", user?.id],
    queryFn: () => profileApi.getMySkills(),
    enabled: !!user,
  });

  const userSkillsForMatch = useMemo(
    () => [
      ...new Set(
        profileSkills.map((skill) => normalizeSkillName(skill.skill_name)),
      ),
    ],
    [profileSkills],
  );

  const jobs = useMemo(() => {
    return listedJobs
      .map((job): CompanyJob | null => {
        const card = toCompanyJob(job);
        if (!card) return null;
        const matchPercentage = user
          ? matchJobDetailToUser(
              job as unknown as JobDetail,
              buildUserMatchProfileFromSkillTest(userSkillsForMatch),
            ).overallPercent
          : undefined;
        return {
          ...card,
          isSaved: savedJobIds.includes(card.id),
          matchPercentage,
        };
      })
      .filter((job): job is CompanyJob => job != null);
  }, [listedJobs, savedJobIds, user, userSkillsForMatch]);

  const { topJobs, otherJobs } = useMemo(() => {
    const split = splitCompanyJobs(jobs);
    return { topJobs: split.top, otherJobs: split.rest };
  }, [jobs]);

  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: jobsQuery.isFetching,
    onLoadMore: () => setPage((current) => current + 1),
  });

  const saveJobMutation = useMutation({
    mutationFn: async (job: CompanyJob) => {
      if (!user) throw new Error("User not logged in");
      await apiClient.post(`${API_ENDPOINTS.JOBS.SAVE_JOB}${job.id}/`);
    },
    onSuccess: (_, job) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(job.isSaved ? "Job Unsaved" : "Job Saved");
    },
    onError: () => {
      toast.error("Failed to save job");
    },
  });

  const profile = companyQuery.data;
  const displayName = profile?.name || requestedName;
  const logo = !logoFailed ? profile?.logo || jobs[0]?.logo : undefined;

  const facts = useMemo(() => {
    if (!profile) return [];
    return [
      profile.industries.length
        ? { icon: Factory, text: profile.industries.join(", ") }
        : null,
      profile.employees ? { icon: Users, text: profile.employees } : null,
      profile.foundedYear
        ? { icon: Calendar, text: `Founded in ${profile.foundedYear}` }
        : null,
      profile.headquarters
        ? { icon: MapPin, text: profile.headquarters }
        : null,
    ].filter(
      (fact): fact is { icon: typeof Factory; text: string } => fact != null,
    );
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto w-full py-6 px-2 sm:px-6 lg:px-8 pb-28">
        {!requestedName ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Company not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-none border-0">
              {companyQuery.isLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className={cn(
                        "h-16 w-16 rounded-2xl object-cover bg-white flex-shrink-0",
                        companyImageShadow,
                      )}
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-16 w-16 rounded-2xl bg-white dark:bg-card flex items-center justify-center flex-shrink-0",
                        companyImageShadow,
                      )}
                    >
                      <Building2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white break-words">
                      {displayName}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {jobsQuery.isLoading && jobs.length === 0
                        ? "Loading open roles"
                        : jobsQuery.isError && jobs.length === 0
                          ? "Open roles unavailable"
                          : jobs.length === 1 && !hasMore
                            ? "1 open role"
                            : `${jobs.length}${hasMore ? "+" : ""} open roles`}
                    </p>
                  </div>
                </div>
              )}

              {profile?.description ? (
                <p className="mt-6 text-gray-600 dark:text-gray-300 leading-relaxed text-[0.95rem] whitespace-pre-line">
                  {profile.description}
                </p>
              ) : null}

              {facts.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {facts.map((fact) => (
                    <div
                      key={fact.text}
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-200"
                    >
                      <fact.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-base font-medium">{fact.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {profile?.website ? (
                <div className="mt-6">
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-white dark:text-black hover:opacity-80 transition-opacity font-medium text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    Visit website
                  </a>
                </div>
              ) : null}
            </div>

            <div className="mt-8 space-y-5">
              {jobsQuery.isLoading && page === 1 ? (
                <div className="divide-y divide-gray-200 overflow-hidden rounded-3xl bg-white dark:divide-gray-700 dark:bg-[#242424]">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="p-4 space-y-3">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : jobsQuery.isError ? (
                <div className="rounded-3xl bg-white p-8 text-center text-sm text-muted-foreground dark:bg-[#242424]">
                  Could not load open roles for {displayName}.
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center text-muted-foreground dark:bg-[#242424]">
                  <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-foreground">No open roles</p>
                  <p className="text-sm mt-1">
                    {displayName} does not have active listings right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    {
                      key: "top",
                      title: "Top matches",
                      jobs: topJobs,
                      featured: true,
                    },
                    {
                      key: "rest",
                      title: "All openings",
                      jobs: otherJobs,
                      featured: false,
                    },
                  ]
                    .filter((section) => section.jobs.length > 0)
                    .map((section) => (
                      <div
                        key={section.key}
                        className="overflow-hidden rounded-3xl bg-white dark:bg-[#242424]"
                      >
                        {section.title ? (
                          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                            <h3 className="text-base font-semibold">
                              {section.title}
                            </h3>
                          </div>
                        ) : null}
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {section.jobs.map((job) => (
                            <div
                              key={job.id}
                              className="group cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                              onClick={() =>
                                navigate(`/jobs/${encodeURIComponent(job.id)}`)
                              }
                            >
                              {isMobile ? (
                                <div className="px-5 pt-5 pb-4">
                                  <h3 className="mb-2 font-bold text-base line-clamp-2 leading-6">
                                    {job.title}
                                  </h3>
                                  <p className="mb-2 text-xs text-gray-500 truncate">
                                    {job.location}
                                  </p>
                                  <JobListingMetaBadges
                                    className="mt-1"
                                    employmentType={job.employmentType}
                                    workArrangement={job.workArrangement}
                                    salary={job.salary}
                                  />
                                  <div className="mt-5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <RadialProgress
                                        value={job.matchPercentage ?? 0}
                                        size={40}
                                        strokeWidth={4}
                                        showLabel={false}
                                        percentageTextSize="sm"
                                        className={cn(
                                          "flex-shrink-0",
                                          section.featured
                                            ? "text-primary"
                                            : "text-gray-400 dark:text-gray-500",
                                        )}
                                      />
                                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 whitespace-nowrap">
                                        {getMatchQualityLabel(
                                          job.matchPercentage,
                                        )}
                                      </span>
                                    </div>
                                    {user ? (
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          saveJobMutation.mutate(job);
                                        }}
                                        disabled={saveJobMutation.isPending}
                                        aria-label={
                                          job.isSaved
                                            ? "Unsave job"
                                            : "Save job"
                                        }
                                        className={cn(
                                          "flex-shrink-0 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                                          job.isSaved
                                            ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                                            : "text-black dark:text-white",
                                        )}
                                      >
                                        <Bookmark
                                          className={cn(
                                            "h-4 w-4 transition-colors",
                                            job.isSaved
                                              ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                              : "text-black dark:text-white",
                                          )}
                                        />
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-4">
                                  <div className="flex-1 p-4 min-w-0">
                                    <h3 className="font-bold text-base md:text-lg mb-2 line-clamp-2">
                                      {job.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        <span>{job.location}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" />
                                        <span>{job.employmentType}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Briefcase className="h-4 w-4" />
                                        <span>{job.workArrangement}</span>
                                      </div>
                                      {job.salary ? (
                                        <div className="flex items-center gap-1.5">
                                          <span>{job.salary}</span>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 py-4 pl-4 pr-14 relative w-24 min-h-[88px] flex flex-col items-center justify-center">
                                    <div className="flex flex-col items-center gap-2 px-2 transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none">
                                      <RadialProgress
                                        value={job.matchPercentage ?? 0}
                                        size={48}
                                        strokeWidth={4}
                                        showLabel={false}
                                        percentageTextSize="md"
                                        className={cn(
                                          "flex-shrink-0",
                                          section.featured
                                            ? "text-primary"
                                            : "text-gray-400 dark:text-gray-500",
                                        )}
                                      />
                                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap text-center">
                                        {getMatchQualityLabel(
                                          job.matchPercentage,
                                        )}
                                      </span>
                                    </div>
                                    {user ? (
                                      <Button
                                        variant="secondary"
                                        size="icon"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          saveJobMutation.mutate(job);
                                        }}
                                        disabled={saveJobMutation.isPending}
                                        aria-label={
                                          job.isSaved
                                            ? "Unsave job"
                                            : "Save job"
                                        }
                                        className={cn(
                                          "absolute top-4 right-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10 bg-[#E6E7EB] hover:bg-[#E6E7EB]/90 dark:bg-[#3A3A3A] dark:hover:bg-[#4A4A4A] h-10 w-10",
                                          job.isSaved
                                            ? "text-breneo-blue bg-breneo-blue/10 hover:bg-breneo-blue/15 dark:bg-breneo-blue/20 dark:hover:bg-breneo-blue/30"
                                            : "text-black dark:text-white",
                                        )}
                                      >
                                        <Bookmark
                                          className={cn(
                                            "h-4 w-4 transition-colors",
                                            job.isSaved
                                              ? "text-breneo-blue fill-breneo-blue animate-heart-pop"
                                              : "text-black dark:text-white",
                                          )}
                                        />
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {hasMore ? (
                <div
                  ref={loadMoreRef}
                  className="flex justify-center py-4"
                  aria-live="polite"
                >
                  {jobsQuery.isFetching ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : null}
                </div>
              ) : jobs.length > 0 && !jobsQuery.isFetching ? (
                <div className="py-8 text-center">
                  <p className="text-base font-semibold text-foreground">
                    You're all caught up! ✨
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You've seen everything for now. Check back soon for new
                    opportunities.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyPage;
