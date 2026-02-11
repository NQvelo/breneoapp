/**
 * Profile page API: me profile, educations, work-experiences, skills.
 * All requests use apiClient (Bearer token is added by interceptor).
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import type {
  ProfilePayload,
  EducationEntry,
  EducationPayload,
  WorkExperienceEntry,
  WorkExperiencePayload,
  UserSkill,
  SkillSuggestion,
} from "./types";

const PROFILE_GET = API_ENDPOINTS.AUTH.PROFILE;
const PROFILE_UPDATE = API_ENDPOINTS.AUTH.PROFILE;

export const profileApi = {
  async getProfile(): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get(PROFILE_GET);
    return data as Record<string, unknown>;
  },

  async updateProfile(payload: ProfilePayload): Promise<Record<string, unknown>> {
    const { data } = await apiClient.patch(PROFILE_UPDATE, payload);
    return data as Record<string, unknown>;
  },

  async getEducations(): Promise<EducationEntry[]> {
    const { data } = await apiClient.get(API_ENDPOINTS.EDUCATIONS);
    return Array.isArray(data) ? data : (data?.results ?? data?.items ?? []);
  },

  async createEducation(payload: EducationPayload): Promise<EducationEntry> {
    const { data } = await apiClient.post(API_ENDPOINTS.EDUCATIONS, payload);
    return data as EducationEntry;
  },

  async getEducation(id: number): Promise<EducationEntry> {
    const { data } = await apiClient.get(`${API_ENDPOINTS.EDUCATIONS}${id}/`);
    return data as EducationEntry;
  },

  async updateEducation(
    id: number,
    payload: Partial<EducationPayload>
  ): Promise<EducationEntry> {
    const { data } = await apiClient.patch(
      `${API_ENDPOINTS.EDUCATIONS}${id}/`,
      payload
    );
    return data as EducationEntry;
  },

  async deleteEducation(id: number): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.EDUCATIONS}${id}/`);
  },

  async getWorkExperiences(): Promise<WorkExperienceEntry[]> {
    const { data } = await apiClient.get(API_ENDPOINTS.WORK_EXPERIENCES);
    return Array.isArray(data) ? data : (data?.results ?? data?.items ?? []);
  },

  async createWorkExperience(
    payload: WorkExperiencePayload
  ): Promise<WorkExperienceEntry> {
    const { data } = await apiClient.post(
      API_ENDPOINTS.WORK_EXPERIENCES,
      payload
    );
    return data as WorkExperienceEntry;
  },

  async getWorkExperience(id: number): Promise<WorkExperienceEntry> {
    const { data } = await apiClient.get(
      `${API_ENDPOINTS.WORK_EXPERIENCES}${id}/`
    );
    return data as WorkExperienceEntry;
  },

  async updateWorkExperience(
    id: number,
    payload: Partial<WorkExperiencePayload>
  ): Promise<WorkExperienceEntry> {
    const { data } = await apiClient.patch(
      `${API_ENDPOINTS.WORK_EXPERIENCES}${id}/`,
      payload
    );
    return data as WorkExperienceEntry;
  },

  async deleteWorkExperience(id: number): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.WORK_EXPERIENCES}${id}/`);
  },

  async getMySkills(): Promise<UserSkill[]> {
    const { data } = await apiClient.get(API_ENDPOINTS.ME.SKILLS);
    return Array.isArray(data) ? data : (data?.results ?? data?.items ?? []);
  },

  /** GET user industry profile (industry -> years). Backend may return industry_years or industry_years_json. */
  async getIndustryProfile(): Promise<Record<string, number>> {
    const { data } = await apiClient.get(API_ENDPOINTS.ME.INDUSTRY_PROFILE);
    const raw = data as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") return {};
    const years = (raw.industry_years ?? raw.industry_years_json) as Record<string, number> | undefined;
    return years && typeof years === "object" ? years : {};
  },

  async addSkill(name: string): Promise<UserSkill> {
    const { data } = await apiClient.post(API_ENDPOINTS.ME.SKILLS, { name });
    return data as UserSkill;
  },

  async removeSkill(skillId: number): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.ME.SKILLS}${skillId}/`);
  },

  async searchSkills(query: string): Promise<SkillSuggestion[]> {
    if (!query.trim()) return [];
    const { data } = await apiClient.get(API_ENDPOINTS.SKILLS_SEARCH, {
      params: { query: query.trim() },
    });
    return Array.isArray(data) ? data : (data?.results ?? data?.items ?? []);
  },
};
