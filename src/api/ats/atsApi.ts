/**
 * Authenticated CV parse, saved resume, and job match.
 * Uses the shared apiClient, which sends Authorization: Bearer <access_token>.
 */

import axios, { type RawAxiosRequestHeaders } from "axios";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import type { MatchRequest, MatchResponse, Resume, SavedResumeResponse } from "./types";

const PARSE_TIMEOUT_MS = 120_000;
const MATCH_TIMEOUT_MS = 60_000;

export class AtsRequestError extends Error {
  readonly detail: string;
  readonly code: string;
  readonly status: number | null;

  constructor(detail: string, code: string, status: number | null) {
    super(detail);
    this.name = "AtsRequestError";
    this.detail = detail;
    this.code = code;
    this.status = status;
  }
}

function stripJsonContentType(headers: RawAxiosRequestHeaders | undefined): void {
  if (!headers) return;
  const withDelete = headers as { delete?: (name: string) => void };
  if (typeof withDelete.delete === "function") {
    withDelete.delete("Content-Type");
    return;
  }
  const plain = headers as Record<string, unknown>;
  delete plain["Content-Type"];
  delete plain["content-type"];
}

export function toAtsRequestError(error: unknown, fallback: string): AtsRequestError {
  if (error instanceof AtsRequestError) return error;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const detail =
      typeof record?.detail === "string" && record.detail.trim()
        ? record.detail.trim()
        : typeof data === "string" && data.trim()
          ? data.trim()
          : fallback;
    const code = typeof record?.code === "string" ? record.code : "";
    return new AtsRequestError(detail, code, error.response?.status ?? null);
  }
  if (error instanceof Error && error.message.trim()) {
    return new AtsRequestError(error.message.trim(), "", null);
  }
  return new AtsRequestError(fallback, "", null);
}

export async function parseResumeFile(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<Resume>(API_ENDPOINTS.ATS.PARSE, formData, {
    timeout: PARSE_TIMEOUT_MS,
    transformRequest: [
      (body, headers) => {
        if (body instanceof FormData) {
          stripJsonContentType(headers);
        }
        return body;
      },
    ],
  });
  return data;
}

export async function getMyResume(): Promise<SavedResumeResponse> {
  const { data } = await apiClient.get<SavedResumeResponse>(API_ENDPOINTS.ME.RESUME);
  return {
    resume: data?.resume ?? null,
    source_filename:
      typeof data?.source_filename === "string" ? data.source_filename : "",
    updated_at: typeof data?.updated_at === "string" ? data.updated_at : null,
  };
}

export async function matchResume(body: MatchRequest): Promise<MatchResponse> {
  const payload: MatchRequest = { resume: body.resume };
  const jobId = body.job_id?.trim();
  const jobDescription = body.job_description?.trim();
  const jobTitle = body.job_title?.trim();
  if (jobId) payload.job_id = jobId;
  if (jobDescription) payload.job_description = jobDescription;
  if (jobTitle) payload.job_title = jobTitle;
  const { data } = await apiClient.post<MatchResponse>(
    API_ENDPOINTS.ATS.MATCH,
    payload,
    { timeout: MATCH_TIMEOUT_MS },
  );
  return data;
}
