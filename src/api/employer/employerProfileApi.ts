/**
 * Employer logo upload helpers.
 *
 * - Breneo profile upload: PATCH /api/employer/profile/ (multipart)
 * - Job directory company: same-origin BFF `/api/employer/companies/{id}?external_user_id=…`
 *   (dev: Vite → employer-jobs-proxy). Browser sends Bearer JWT only; BFF adds `X-Employer-Key`.
 *   Do not call the aggregator origin from the browser with `X-Employer-Key` — CORS will block it.
 * - Multipart file field name: `logo_upload`
 */

import type { AxiosResponse } from "axios";
import type { RawAxiosRequestHeaders } from "axios";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";
import { getEmployerJobsApiBaseUrl } from "@/api/employer/employerJobsApiBase";
import {
  extractAggregatorErrorMessage,
  parseAggregatorFieldErrors,
} from "@/api/employer/aggregatorHttpErrors";

function stripJsonContentTypeForFormData(
  headers: RawAxiosRequestHeaders | undefined,
): void {
  if (!headers) return;
  const h = headers as { delete?: (name: string) => void };
  if (typeof h.delete === "function") {
    h.delete("Content-Type");
    return;
  }
  const plain = headers as Record<string, unknown>;
  delete plain["Content-Type"];
  delete plain["content-type"];
}

export function patchEmployerProfileFormData(
  fd: FormData,
): Promise<AxiosResponse<unknown>> {
  return apiClient.patch(API_ENDPOINTS.EMPLOYER.PROFILE, fd, {
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          stripJsonContentTypeForFormData(headers);
        }
        return data;
      },
    ],
  });
}

function parsePositiveCompanyId(raw: number | string): number {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  const parsed = Number(String(raw).trim());
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  throw new Error("Invalid company id for logo upload.");
}

type UploadEmployerCompanyLogoArgs = {
  companyId: number | string;
  externalUserId: string;
  file: File;
  fields?: Record<string, string | number | null | undefined>;
};

type FetchEmployerCompanyFromAggregatorArgs = {
  companyId: number | string;
  externalUserId: string;
};

/**
 * Upload company logo via BFF (multipart). Field name: `logo_upload`.
 */
export async function uploadEmployerCompanyLogoToAggregator(
  args: UploadEmployerCompanyLogoArgs,
): Promise<Record<string, unknown>> {
  const id = parsePositiveCompanyId(args.companyId);
  const extUserId = args.externalUserId.trim();
  if (!extUserId) {
    throw new Error("Missing external user id for scoped company logo upload.");
  }
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const url = new URL(`/api/employer/companies/${id}`, `${base}/`);
  url.searchParams.set("external_user_id", extUserId);

  const formData = new FormData();
  formData.append("logo_upload", args.file);
  if (args.fields) {
    for (const [key, value] of Object.entries(args.fields)) {
      if (value == null) continue;
      const s = String(value).trim();
      if (s === "") continue;
      formData.append(key, s);
    }
  }

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: formData,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = extractAggregatorErrorMessage(data, "Upload failed");
    const err = new Error(detail) as Error & {
      status?: number;
      fieldErrors?: Record<string, string[]>;
    };
    err.status = res.status;
    const fe = parseAggregatorFieldErrors(data);
    if (Object.keys(fe).length > 0) err.fieldErrors = fe;
    throw err;
  }
  return data;
}

/** GET company detail via same-origin BFF (Bearer JWT). */
export async function fetchEmployerCompanyFromAggregator(
  args: FetchEmployerCompanyFromAggregatorArgs,
): Promise<Record<string, unknown>> {
  const id = parsePositiveCompanyId(args.companyId);
  const extUserId = args.externalUserId.trim();
  if (!extUserId) {
    throw new Error("Missing external user id for scoped company detail.");
  }
  const token = TokenManager.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const base = getEmployerJobsApiBaseUrl().replace(/\/$/, "");
  const url = new URL(`/api/employer/companies/${id}`, `${base}/`);
  url.searchParams.set("external_user_id", extUserId);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = extractAggregatorErrorMessage(
      data,
      "Could not load company detail",
    );
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}
