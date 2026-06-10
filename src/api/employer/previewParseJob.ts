import { employerBffFetch } from "@/api/employer/employerBffClient";
import {
  assertEmployerJobsProxyConfigured,
  getEmployerJobsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";

export type EmployerJobPreviewParseResult = {
  description: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  skills_preferred?: string[];
  useDescriptionOnly: boolean;
  aiAvailable: boolean;
};

export async function previewParseEmployerJob(
  fullDescription: string,
): Promise<EmployerJobPreviewParseResult> {
  assertEmployerJobsProxyConfigured("POST");

  const url = new URL(
    "/api/employer/jobs/preview-parse",
    getEmployerJobsApiBaseUrl(),
  ).toString();

  const res = await employerBffFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ full_description: fullDescription.trim() }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : res.statusText || "Could not analyze job description";
    throw new Error(detail);
  }

  return {
    description: String(data.description ?? "").trim(),
    responsibilities: Array.isArray(data.responsibilities)
      ? data.responsibilities.map((x) => String(x).trim()).filter(Boolean)
      : [],
    qualifications: Array.isArray(data.qualifications)
      ? data.qualifications.map((x) => String(x).trim()).filter(Boolean)
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.map((x) => String(x).trim()).filter(Boolean)
      : [],
    skills_preferred: Array.isArray(data.skills_preferred)
      ? data.skills_preferred.map((x) => String(x).trim()).filter(Boolean)
      : [],
    useDescriptionOnly: data.useDescriptionOnly === true,
    aiAvailable: data.aiAvailable !== false,
  };
}
