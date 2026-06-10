import type { EmployerJob } from "@/api/employer/jobsApi";
import { getEmployerJobStoredSkills } from "@/api/employer/jobsApi";
import type { JobDetail } from "@/api/jobs/types";
import {
  formatJobSectionList,
  resolveJobSectionsAfterAi,
} from "@/utils/jobSectionsDedup";
import { resolveJobDisplayRequiredSkills } from "@/utils/jobSkillsResolve";

/** Map employer job stats row to JobDetail for matchJobDetailToUser. */
export function employerJobToJobDetail(job: EmployerJob): JobDetail {
  const resolved = resolveJobSectionsAfterAi({
    description: job.job_description_summary ?? job.description,
    responsibilities: job.responsibilities,
    qualifications: job.qualifications,
  });
  const fullDescription = String(job.description ?? "").trim();
  const qualificationsText = formatJobSectionList(resolved.qualifications);

  return {
    id: job.id,
    title: job.title,
    job_title: job.title,
    description: resolved.useDescriptionOnly
      ? resolved.description
      : fullDescription,
    job_description: fullDescription,
    full_description: fullDescription,
    location: job.location,
    country: job.country ?? job.location_country,
    city: job.city,
    employment_type: job.employment_type,
    remote: job.remote,
    responsibilities: formatJobSectionList(resolved.responsibilities),
    qualifications: qualificationsText,
    job_requirements: qualificationsText,
    required_skills: job.required_skills,
    skills_required: job.required_skills,
    skills: job.required_skills,
    company_name: job.company_name,
  };
}

/** Same required-skills list as employer job form chips and candidate job detail. */
export function resolveEmployerJobRequiredSkills(job: EmployerJob): string[] {
  const stored = getEmployerJobStoredSkills(job);
  if (stored.length > 0) return stored;
  return resolveJobDisplayRequiredSkills(employerJobToJobDetail(job));
}
