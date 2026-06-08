import type { EmployerJob } from "@/api/employer/jobsApi";
import type { JobDetail } from "@/api/jobs/types";
import {
  formatJobSectionList,
  resolveJobSectionsAfterAi,
} from "@/utils/jobSectionsDedup";

/** Map employer job stats row to JobDetail for matchJobDetailToUser. */
export function employerJobToJobDetail(job: EmployerJob): JobDetail {
  const resolved = resolveJobSectionsAfterAi({
    description: job.job_description_summary ?? job.description,
    responsibilities: job.responsibilities,
    qualifications: job.qualifications,
  });

  return {
    id: job.id,
    title: job.title,
    description: resolved.useDescriptionOnly
      ? resolved.description
      : job.description,
    location: job.location,
    country: job.country ?? job.location_country,
    city: job.city,
    employment_type: job.employment_type,
    remote: job.remote,
    responsibilities: formatJobSectionList(resolved.responsibilities),
    qualifications: formatJobSectionList(resolved.qualifications),
    required_skills: job.required_skills,
    skills_required: job.required_skills,
    skills: job.required_skills,
    company_name: job.company_name,
  };
}
