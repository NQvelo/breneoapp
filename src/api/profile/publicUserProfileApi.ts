import { BRENEO_API_BASE_URL } from "@/api/auth/config";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";

/** GET /api/users/{userId}/profile/ — public, no Authorization header. */
export async function fetchPublicUserProfile(
  userId: number,
): Promise<PublicUserProfile> {
  const base = BRENEO_API_BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/users/${userId}/profile/`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new PublicUserProfileError(
      body.error ?? `Failed to load profile (${res.status})`,
      res.status,
    );
  }
  return res.json() as Promise<PublicUserProfile>;
}

export class PublicUserProfileError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicUserProfileError";
  }
}
