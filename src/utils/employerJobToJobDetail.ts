import type { EmployerJob } from "@/api/employer/jobsApi";
import type { JobDetail } from "@/api/jobs/types";

/** Map employer job stats row to JobDetail for matchJobDetailToUser. */
export function employerJobToJobDetail(job: EmployerJob): JobDetail {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    country: job.country ?? job.location_country,
    city: job.city,
    employment_type: job.employment_type,
    remote: job.remote,
    responsibilities: job.responsibilities?.join("\n"),
    qualifications: job.qualifications?.join("\n"),
    company_name: job.company_name,
  };
}
