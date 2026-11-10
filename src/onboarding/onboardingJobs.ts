import { jobService, type ApiJob } from "@/api/jobs";
import {
  jobMatchesOnboardingLocation,
  locationSearchCountries,
  roleSearchKeywords,
  type OnboardingExperience,
  type OnboardingLocation,
} from "@/onboarding/onboardingAnswers";
import {
  resolveJobEmploymentType,
  resolveJobWorkArrangement,
} from "@/utils/jobEmploymentDisplay";
import { formatJobSalaryDisplay } from "@/utils/jobSalaryFormat";

export type PreviewJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  logo?: string;
  employmentType: string;
  workArrangement: string;
  salary: string;
};

const SENIOR_TITLE = /\b(senior|lead|principal|head|director|staff)\b/i;
const JUNIOR_TITLE = /\b(junior|intern|entry|graduate|trainee)\b/i;

function textField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function locationOf(job: ApiJob): string {
  const direct = textField(job.location);
  if (direct) return direct;
  const parts = [
    job.job_city,
    job.city,
    job.job_state,
    job.state,
    job.job_country,
    job.country,
  ]
    .map(textField)
    .filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function logoOf(job: ApiJob): string | undefined {
  const candidates = [
    job.company_logo,
    job.employer_logo,
    job.logo_url,
    job.logo_upload,
  ];
  for (const candidate of candidates) {
    const logo = textField(candidate);
    if (!logo) continue;
    if (logo.startsWith("//")) return `https:${logo}`;
    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:") ||
      logo.startsWith("/")
    ) {
      return logo;
    }
  }
  return undefined;
}

function countryOf(job: ApiJob): string {
  const extra = job as { location_country?: unknown };
  return textField(job.job_country || job.country || extra.location_country);
}

function toPreviewJob(job: ApiJob): PreviewJob {
  const title = textField(job.job_title || job.title);
  const company = textField(job.company_name || job.employer_name || job.company);
  return {
    id: String(job.job_id || job.id || `${title}-${company}`),
    title,
    company,
    location: locationOf(job),
    logo: logoOf(job),
    employmentType: resolveJobEmploymentType(job),
    workArrangement: resolveJobWorkArrangement(job),
    salary: formatJobSalaryDisplay(job),
  };
}

function experienceBoost(
  title: string,
  experience: OnboardingExperience | null | undefined,
): number {
  if (!experience) return 0;
  const senior = SENIOR_TITLE.test(title);
  const junior = JUNIOR_TITLE.test(title);
  if (experience === "senior") return senior ? 3 : junior ? -2 : 0;
  if (experience === "starting") return junior ? 3 : senior ? -2 : 0;
  if (experience === "some") return junior ? 1 : senior ? -1 : 0;
  return senior ? 1 : 0;
}

function pickTopJobs(
  jobs: ApiJob[],
  keywords: string[],
  limit: number,
  experience: OnboardingExperience | null | undefined,
): PreviewJob[] {
  const lowered = keywords.map((word) => word.toLowerCase());
  const scored = jobs
    .map((job) => {
      const preview = toPreviewJob(job);
      const haystack = preview.title.toLowerCase();
      const score = lowered.reduce(
        (total, word) => total + (haystack.includes(word) ? 1 : 0),
        0,
      );
      return {
        ...preview,
        score,
        level: experienceBoost(preview.title, experience),
      };
    })
    .filter((job) => job.title && job.score > 0);

  scored.sort(
    (left, right) => right.score - left.score || right.level - left.level,
  );
  const seen = new Set<string>();
  const top: PreviewJob[] = [];
  for (const job of scored) {
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    top.push({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      logo: job.logo,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      salary: job.salary,
    });
    if (top.length === limit) break;
  }
  return top;
}

function seniorityForExperience(
  experience: OnboardingExperience | null | undefined,
): string[] {
  if (experience === "starting") return ["intern", "junior"];
  if (experience === "some") return ["junior", "mid"];
  if (experience === "mid") return ["mid", "senior"];
  if (experience === "senior") return ["senior", "lead"];
  return [];
}

async function fetchMatchingJobs(
  keywords: string[],
  countries: string[],
  seniority: string[],
): Promise<ApiJob[]> {
  if (keywords.length === 0) return [];
  const result = await jobService.fetchActiveJobs({
    query: "",
    page: 1,
    pageSize: 40,
    sort: "newest",
    filters: {
      country: "",
      countries: [],
      jobTypes: [],
      isRemote: false,
      skills: keywords,
      ...(countries.length > 0 ? { locationCountry: countries } : {}),
      ...(seniority.length > 0 ? { seniority } : {}),
    },
  });
  return result.jobs;
}

function roleMatches(
  jobs: ApiJob[],
  role: string,
  choices: readonly OnboardingLocation[],
  limit: number,
  experience: OnboardingExperience | null | undefined,
): PreviewJob[] {
  const keywords = roleSearchKeywords([role]);
  const scoped =
    choices.length > 0
      ? jobs.filter((job) =>
          choices.some((choice) =>
            jobMatchesOnboardingLocation(countryOf(job), locationOf(job), choice),
          ),
        )
      : jobs;
  return pickTopJobs(scoped, keywords, limit, experience);
}

function mergeRoleJobs(lists: PreviewJob[][], limit: number): PreviewJob[] {
  const merged: PreviewJob[] = [];
  const seen = new Set<string>();
  const longest = lists.reduce((count, list) => Math.max(count, list.length), 0);
  for (let index = 0; index < longest && merged.length < limit; index += 1) {
    for (const list of lists) {
      const job = list[index];
      if (!job) continue;
      const key = `${job.title}|${job.company}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
      if (merged.length === limit) break;
    }
  }
  return merged;
}

export async function loadJobsForRoles(
  roles: readonly string[],
  choices: readonly OnboardingLocation[],
  options?: { limit?: number; experience?: OnboardingExperience | null },
): Promise<PreviewJob[]> {
  const limit = options?.limit ?? 5;
  const experience = options?.experience;
  const seniority = seniorityForExperience(experience);
  const matched = await searchJobsForRoles(
    roles,
    choices,
    limit,
    experience,
    seniority,
  );
  if (matched.length > 0 || seniority.length === 0) return matched;
  return searchJobsForRoles(roles, choices, limit, experience, []);
}

async function searchJobsForRoles(
  roles: readonly string[],
  choices: readonly OnboardingLocation[],
  limit: number,
  experience: OnboardingExperience | null | undefined,
  seniority: string[],
): Promise<PreviewJob[]> {
  const keywords = roleSearchKeywords(roles);
  const countries = locationSearchCountries(choices);
  const regionalJobs = await fetchMatchingJobs(
    keywords,
    countries,
    seniority,
  ).catch(() => []);
  const regional = mergeRoleJobs(
    roles.map((role) =>
      roleMatches(regionalJobs, role, choices, limit, experience),
    ),
    limit,
  );
  if (regional.length > 0 || countries.length === 0) return regional;
  const allJobs = await fetchMatchingJobs(keywords, [], seniority).catch(
    () => [],
  );
  return mergeRoleJobs(
    roles.map((role) => roleMatches(allJobs, role, [], limit, experience)),
    limit,
  );
}
