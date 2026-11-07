/**
 * Clear CV-derived profile content or delete the signed-in account.
 * Clear removes the saved resume, About Me, education, work experience, and skills.
 * Name, surname, phone, location, and profile photo are left as entered.
 * Delete uses DELETE /api/profile/, which the API allows for the current user.
 */

import axios from "axios";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { refreshUserIndustryProfile } from "@/services/industry/refreshUserIndustryProfile";
import { profileApi } from "./profileApi";

export function readAccountError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.detail === "string" && record.detail.trim()) {
        return record.detail.trim();
      }
      if (typeof record.error === "string" && record.error.trim()) {
        return record.error.trim();
      }
    }
    if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) {
      return data.trim();
    }
  }
  return fallback;
}

async function clearAboutMe(): Promise<void> {
  try {
    await profileApi.updateProfile({ about_me: null });
  } catch {
    await profileApi.updateProfile({ about_me: "" });
  }
}

/** The resume route only advertises GET. Try the write methods anyway. */
async function clearSavedResume(): Promise<void> {
  const empty = { resume: null, source_filename: "" };
  const attempts = [
    () => apiClient.delete(API_ENDPOINTS.ME.RESUME),
    () => apiClient.put(API_ENDPOINTS.ME.RESUME, empty),
    () => apiClient.patch(API_ENDPOINTS.ME.RESUME, empty),
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await attempt();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Remove CV parser output and the profile sections it fills.
 * Registration details stay: name, surname, phone, location, and profile photo.
 */
export async function clearAccountData(userId: string): Promise<void> {
  const [educations, experiences, skills] = await Promise.all([
    profileApi.getEducations().catch(() => []),
    profileApi.getWorkExperiences().catch(() => []),
    profileApi.getMySkills().catch(() => []),
  ]);

  const deletions = await Promise.allSettled([
    ...educations.map((item) => profileApi.deleteEducation(item.id)),
    ...experiences.map((item) => profileApi.deleteWorkExperience(item.id)),
    ...skills.map((item) => profileApi.removeSkill(item.skill_id)),
  ]);
  const failedDeletes = deletions.filter((result) => result.status === "rejected");
  if (failedDeletes.length > 0) {
    throw failedDeletes[0].reason;
  }

  await Promise.all([
    clearAboutMe(),
    clearSavedResume().catch(() => undefined),
    refreshUserIndustryProfile(userId, []).catch(() => undefined),
  ]);
}

/** Permanently delete the signed-in account. */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.AUTH.PROFILE);
}
