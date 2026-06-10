import { TokenManager } from "@/api/auth/tokenManager";

function mergeHeaders(base: HeadersInit, extra?: HeadersInit): HeadersInit {
  const out = new Headers(base);
  if (extra) {
    new Headers(extra).forEach((value, key) => {
      out.set(key, value);
    });
  }
  return out;
}

/** Ensures a valid JWT is available before employer BFF calls. */
export async function requireEmployerBffAuth(): Promise<string> {
  const token = await TokenManager.getValidAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

export async function buildEmployerBffAuthHeaders(
  extra?: HeadersInit,
): Promise<HeadersInit> {
  const token = await requireEmployerBffAuth();
  return mergeHeaders(
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    extra,
  );
}

/**
 * Authenticated fetch for same-origin employer BFF routes.
 * Refreshes expired tokens proactively and retries once on 401.
 */
export async function employerBffFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let headers = await buildEmployerBffAuthHeaders(init?.headers);
  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    const refreshed = await TokenManager.refreshAccessToken();
    if (refreshed) {
      headers = await buildEmployerBffAuthHeaders(init?.headers);
      res = await fetch(input, { ...init, headers });
    }
  }

  return res;
}
