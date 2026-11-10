import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { getMyResume, type SavedResumeResponse } from "@/api/ats";
import { profileApi } from "@/api/profile";

const emptyResume: SavedResumeResponse = {
  resume: null,
  source_filename: "",
  updated_at: null,
};

/** Server check for the welcome gate. Not stored in localStorage or sessionStorage. */
export const PROFILE_GATE_QUERY_KEY = ["profileGate"] as const;

function isMissing(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

const freshServerCheck = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: "always" as const,
  retry: 1,
};

/**
 * Home, Jobs, and Growth show only the welcome screen when the server
 * has no saved CV and no work experience. Signup answers on this device
 * do not count.
 */
export function useNeedsProfileForMatching(userId: string | number | undefined) {
  const enabled = userId != null && userId !== "";

  const resumeQuery = useQuery({
    queryKey: [...PROFILE_GATE_QUERY_KEY, userId, "resume"],
    queryFn: async () => {
      try {
        return await getMyResume();
      } catch (error) {
        if (isMissing(error)) return emptyResume;
        throw error;
      }
    },
    enabled,
    ...freshServerCheck,
  });

  const experiencesQuery = useQuery({
    queryKey: [...PROFILE_GATE_QUERY_KEY, userId, "experience"],
    queryFn: async () => {
      try {
        return await profileApi.getWorkExperiences();
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
    enabled,
    ...freshServerCheck,
  });

  const skillsQuery = useQuery({
    queryKey: ["profileSkills", userId],
    queryFn: async () => {
      try {
        return await profileApi.getMySkills();
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
    enabled,
  });

  const isCheckingProfile =
    enabled && (resumeQuery.isPending || experiencesQuery.isPending);

  const gateFailed = resumeQuery.isError || experiencesQuery.isError;

  const hasResume = Boolean(resumeQuery.data?.resume);
  const hasExperience = (experiencesQuery.data?.length ?? 0) > 0;

  const showProfileWelcome =
    enabled &&
    !isCheckingProfile &&
    !gateFailed &&
    !hasResume &&
    !hasExperience;

  return {
    isCheckingProfile,
    showProfileWelcome,
    profileSkills: skillsQuery.data ?? [],
  };
}
