import { useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyResume,
  matchResume,
  parseResumeFile,
  toAtsRequestError,
  type ResumeMatch,
  type SavedResumeResponse,
} from "@/api/ats";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { profileApi } from "@/api/profile";
import { FileUp, Loader2 } from "@/components/icons";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionUi";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { CvDocument } from "./CvDocument";
import { CvMatchPanel, type CvScoreInput } from "./CvMatchPanel";
import { resumeFileProblem } from "./cvDisplay";

function readProfileString(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const direct = record[key];
  if (typeof direct === "string") return direct;
  for (const nestKey of ["profile", "user"]) {
    const nested = record[nestKey];
    if (!nested || typeof nested !== "object") continue;
    const value = (nested as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export function AccountCvSection() {
  const t = useTranslation();
  const copy = t.settings.accountPage.cv;
  const { user, refreshUser, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [match, setMatch] = useState<ResumeMatch | null>(null);
  const [scoring, setScoring] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const resumeKey = ["myResume", user?.id] as const;
  const resumeQuery = useQuery({
    queryKey: resumeKey,
    queryFn: getMyResume,
    enabled: Boolean(user),
  });

  const saved = resumeQuery.data;
  const resume = saved?.resume ?? null;

  const refreshRelatedProfile = async () => {
    const [meProfile] = await Promise.all([
      apiClient.get(API_ENDPOINTS.ME.PROFILE).catch(() => null),
      refreshUser(),
      profileApi.getEducations().catch(() => undefined),
      profileApi.getWorkExperiences().catch(() => undefined),
      profileApi.getMySkills().catch(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["profileSkills"] }),
    ]);
    const data = meProfile?.data;
    const firstName = readProfileString(data, "first_name");
    const lastName = readProfileString(data, "last_name");
    const phoneNumber = readProfileString(data, "phone_number");
    const patch: {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
    } = {};
    if (firstName !== undefined) patch.first_name = firstName;
    if (lastName !== undefined) patch.last_name = lastName;
    if (phoneNumber !== undefined) patch.phone_number = phoneNumber;
    if (Object.keys(patch).length > 0) updateUser(patch);
  };

  const uploadFile = async (file: File) => {
    const problem = resumeFileProblem(file);
    if (problem === "too_large") {
      setUploadError(copy.fileTooLarge);
      return;
    }
    if (problem === "unsupported") {
      setUploadError(copy.unsupportedFormat);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const parsed = await parseResumeFile(file);
      if (!parsed || typeof parsed !== "object") {
        setUploadError(copy.uploadFailed);
        return;
      }
      const next: SavedResumeResponse = {
        resume: parsed,
        source_filename: parsed.source_filename || file.name,
        updated_at: null,
      };
      queryClient.setQueryData(resumeKey, next);
      setMatch(null);
      setMatchError(null);
      const fresh = await getMyResume().catch(() => null);
      if (fresh?.resume) {
        queryClient.setQueryData(resumeKey, fresh);
      }
      await refreshRelatedProfile();
    } catch (error) {
      setUploadError(toAtsRequestError(error, copy.uploadFailed).detail);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadFile(file);
  };

  const scoreResume = async (input: CvScoreInput) => {
    if (!input.jobId && !input.jobDescription) {
      setMatchError(copy.needJob);
      return;
    }
    setScoring(true);
    setMatchError(null);
    try {
      const latest = await getMyResume();
      queryClient.setQueryData(resumeKey, latest);
      if (!latest.resume) {
        setMatch(null);
        setMatchError(copy.resumeMissing);
        return;
      }
      const result = await matchResume({
        resume: latest.resume,
        job_id: input.jobId,
        job_description: input.jobDescription,
        job_title: input.jobTitle,
      });
      setMatch(result.match);
      if (result.resume) {
        queryClient.setQueryData(resumeKey, {
          resume: result.resume,
          source_filename:
            result.resume.source_filename || latest.source_filename,
          updated_at: latest.updated_at,
        } satisfies SavedResumeResponse);
      }
    } catch (error) {
      setMatchError(toAtsRequestError(error, copy.matchFailed).detail);
    } finally {
      setScoring(false);
    }
  };

  const loadError = resumeQuery.isError
    ? toAtsRequestError(resumeQuery.error, copy.loadFailed).detail
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <SettingsSectionCard>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
            disabled={uploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:bg-muted",
              uploading && "opacity-70",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {uploading
                ? copy.uploading
                : resume
                  ? copy.replace
                  : copy.upload}
            </span>
            <span className="text-xs text-muted-foreground">{copy.fileHint}</span>
          </button>
          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}
        </div>
      </SettingsSectionCard>

      {user && resumeQuery.isPending && !resume ? (
        <SettingsSectionCard>
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        </SettingsSectionCard>
      ) : null}

      {loadError ? (
        <SettingsSectionCard>
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void resumeQuery.refetch()}
          >
            {copy.retry}
          </Button>
        </SettingsSectionCard>
      ) : null}

      {!resumeQuery.isPending && !resume && !loadError ? (
        <SettingsSectionCard>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{copy.emptyTitle}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {copy.emptyBody}
            </p>
          </div>
        </SettingsSectionCard>
      ) : null}

      {resume ? (
        <>
          <SettingsSectionCard>
            <CvDocument
              resume={resume}
              sourceFilename={saved?.source_filename || resume.source_filename || ""}
            />
          </SettingsSectionCard>
          <CvMatchPanel
            match={match}
            scoring={scoring}
            error={matchError}
            onScore={(input) => void scoreResume(input)}
          />
        </>
      ) : null}
    </div>
  );
}
