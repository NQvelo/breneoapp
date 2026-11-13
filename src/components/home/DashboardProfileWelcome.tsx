import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMyResume,
  parseResumeFile,
  toAtsRequestError,
  type SavedResumeResponse,
} from "@/api/ats";
import { ArrowRight, FileUp, Loader2, PencilLine } from "@/components/icons";
import { resumeFileProblem } from "@/components/profile/cvDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { PROFILE_GATE_QUERY_KEY } from "@/hooks/useNeedsProfileForMatching";
import { cn } from "@/lib/utils";
import { getLocalizedPath } from "@/utils/localeUtils";

const WELCOME_ILLUSTRATION_LIGHT = "/lovable-uploads/profile-welcome-light.png";
const WELCOME_ILLUSTRATION_DARK = "/lovable-uploads/profile-welcome-dark.png";
const RESUME_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const actionCardClass = cn(
  "group flex w-full items-center gap-3 rounded-3xl border border-[#eceef2] bg-white p-3.5 text-left",
  "transition-colors hover:border-[#19B5FE]/40",
  "sm:h-full sm:flex-col sm:items-start sm:gap-0 sm:p-5",
  "dark:border-white/10 dark:bg-[#242424] dark:hover:border-[#19B5FE]/50",
);

function dismissedKey(userId: string): string {
  return `cv-parser-dismissed:${userId}`;
}

export function DashboardProfileWelcome() {
  const t = useTranslation();
  const { language } = useLanguage();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const copy = t.dashboard.profileWelcome;
  const cvCopy = t.settings.accountPage.cv;
  const profilePath = getLocalizedPath("/profile#experience", language);
  const userId = user?.id != null ? String(user.id) : "";

  const uploadFile = async (file: File) => {
    const problem = resumeFileProblem(file);
    if (problem === "too_large") {
      setUploadError(cvCopy.fileTooLarge);
      return;
    }
    if (problem === "unsupported") {
      setUploadError(cvCopy.unsupportedFormat);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const parsed = await parseResumeFile(file);
      if (!parsed || typeof parsed !== "object") {
        setUploadError(cvCopy.uploadFailed);
        return;
      }
      if (userId) sessionStorage.removeItem(dismissedKey(userId));
      const next: SavedResumeResponse = {
        resume: parsed,
        source_filename: parsed.source_filename || file.name,
        updated_at: null,
      };
      queryClient.setQueryData(["myResume", user?.id], next);
      const fresh = await getMyResume().catch(() => null);
      if (fresh?.resume) {
        queryClient.setQueryData(["myResume", user?.id], fresh);
      }
      await refreshUser().catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["profileSkills"] });
      await queryClient.invalidateQueries({ queryKey: ["job-match"] });
      await queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      await queryClient.invalidateQueries({
        queryKey: [...PROFILE_GATE_QUERY_KEY],
      });
    } catch (error) {
      setUploadError(toAtsRequestError(error, cvCopy.uploadFailed).detail);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadFile(file);
  };

  return (
    <section className="-mt-4 flex min-h-full flex-col bg-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mt-8 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-3 pb-3 text-center sm:px-6 sm:pb-6">
          <div className="w-full max-w-[300px] sm:max-w-[360px]">
            <img
              src={WELCOME_ILLUSTRATION_LIGHT}
              alt=""
              className="mx-auto block h-auto max-h-[280px] w-full bg-transparent object-contain sm:max-h-[320px] dark:hidden"
              draggable={false}
            />
            <img
              src={WELCOME_ILLUSTRATION_DARK}
              alt=""
              className="mx-auto hidden h-auto max-h-[280px] w-full bg-transparent object-contain sm:max-h-[320px] dark:block"
              draggable={false}
            />
          </div>
          <h2 className="mt-4 text-lg font-bold leading-snug text-gray-900 dark:text-gray-100 sm:mt-6 sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-snug text-gray-600 dark:text-gray-300 sm:mt-3 sm:text-base sm:leading-relaxed">
            {copy.subtitle}
          </p>
          <div className="mt-4 w-full sm:mt-6">
            <div className="mx-auto grid w-full max-w-3xl gap-2 text-left sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={cn(actionCardClass, "disabled:opacity-70")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileUp className="h-5 w-5" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 sm:mt-4">
                    {copy.uploadTitle}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:mt-1">
                    {uploading ? cvCopy.uploading : copy.uploadBody}
                  </p>
                  <span className="mt-2 hidden items-center gap-1 text-sm font-semibold text-[#19B5FE] sm:mt-auto sm:inline-flex sm:pt-4">
                    {copy.uploadAction}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#19B5FE] sm:hidden" />
              </button>

              <Link to={profilePath} className={actionCardClass}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                  <PencilLine className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 sm:mt-4">
                    {copy.manualTitle}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:mt-1">
                    {copy.manualBody}
                  </p>
                  <span className="mt-2 hidden items-center gap-1 text-sm font-semibold text-[#19B5FE] sm:mt-auto sm:inline-flex sm:pt-4">
                    {copy.manualAction}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#19B5FE] sm:hidden" />
              </Link>
            </div>
            {uploadError ? (
              <p
                className="mt-3 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {uploadError}
              </p>
            ) : null}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={RESUME_ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </section>
  );
}
