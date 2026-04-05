/**
 * Two-backend HTTP clients — each uses exactly one base URL.
 *
 * - Job aggregator (public jobs, search, companies, industries): `createJobAggregatorClient()`
 * - Breneo API (auth, profile, academy, …): `createBreneoApiClient()` → axios with one baseURL
 *
 * Employer `/api/employer/*` from the browser uses `getEmployerJobsApiBaseUrl()` (BFF), not the raw aggregator client.
 */

import axios, { type AxiosInstance } from "axios";
import { BRENEO_API_BASE_URL, JOB_AGGREGATOR_BASE_URL } from "@/api/auth/config";

export type JobAggregatorClient = {
  readonly baseURL: string;
  /** Path must start with `/` (e.g. `/api/search`). Never pass a full URL from another origin. */
  fetch(path: string, init?: RequestInit): Promise<Response>;
};

let jobAggregatorSingleton: JobAggregatorClient | undefined;

/**
 * Fetch wrapper for the job-aggregator origin only (`JOB_AGGREGATOR_BASE_URL` / `VITE_JOB_AGGREGATOR_BASE_URL`).
 */
export function createJobAggregatorClient(): JobAggregatorClient {
  const baseURL = JOB_AGGREGATOR_BASE_URL;
  return {
    baseURL,
    fetch(path: string, init?: RequestInit) {
      if (!path.startsWith("/")) {
        throw new Error(
          `Job aggregator request path must start with / (got: ${path})`,
        );
      }
      const url = new URL(path, `${baseURL}/`).toString();
      return globalThis.fetch(url, init);
    },
  };
}

export function getJobAggregatorClient(): JobAggregatorClient {
  if (!jobAggregatorSingleton) {
    jobAggregatorSingleton = createJobAggregatorClient();
  }
  return jobAggregatorSingleton;
}

/**
 * Axios instance for the Breneo API only (`BRENEO_API_BASE_URL` / `VITE_BRENEO_API_BASE_URL`).
 * Apply auth interceptors in `apiClient.ts` on top of this factory.
 */
export function createBreneoApiClient(): AxiosInstance {
  return axios.create({
    baseURL: BRENEO_API_BASE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
