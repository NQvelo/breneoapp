import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyResume,
  parseResumeFile,
  toAtsRequestError,
  type SavedResumeResponse,
} from "@/api/ats";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { clearAccountData, readAccountError } from "@/api/profile/accountDataApi";
import { profileApi } from "@/api/profile";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
} from "@/components/icons";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionUi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getLocalizedPath } from "@/utils/localeUtils";
import { resumeFileProblem } from "./cvDisplay";

function CvMenuRow({
  icon,
  iconClassName,
  label,
  destructive,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  destructive?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
        destructive
          ? "text-red-600 dark:text-red-400"
          : "text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </span>
  );
}

const emptyResume: SavedResumeResponse = {
  resume: null,
  source_filename: "",
  updated_at: null,
};

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

function dismissedKey(userId: string): string {
  return `cv-parser-dismissed:${userId}`;
}

export function AccountCvSection() {
  const t = useTranslation();
  const copy = t.settings.accountPage.cv;
  const { language } = useLanguage();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const { user, refreshUser, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<
    null | { kind: "success" } | { kind: "error"; message: string }
  >(null);

  const userId = user?.id != null ? String(user.id) : "";
  const resumeKey = ["myResume", user?.id] as const;
  const resumeQuery = useQuery({
    queryKey: resumeKey,
    queryFn: async () => {
      const saved = await getMyResume();
      if (
        userId &&
        typeof window !== "undefined" &&
        sessionStorage.getItem(dismissedKey(userId)) === "1"
      ) {
        return emptyResume;
      }
      return saved;
    },
    enabled: Boolean(user),
  });

  const saved = resumeQuery.data;
  const resume = saved?.resume ?? null;
  const filename =
    saved?.source_filename?.trim() || resume?.source_filename?.trim() || "";

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

  const showUploadError = (message: string) => {
    setUploadResult({ kind: "error", message });
  };

  const uploadFile = async (file: File) => {
    const problem = resumeFileProblem(file);
    if (problem === "too_large") {
      showUploadError(copy.fileTooLarge);
      return;
    }
    if (problem === "unsupported") {
      showUploadError(copy.unsupportedFormat);
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const parsed = await parseResumeFile(file);
      if (!parsed || typeof parsed !== "object") {
        showUploadError(copy.uploadFailed);
        return;
      }
      if (userId) sessionStorage.removeItem(dismissedKey(userId));
      const next: SavedResumeResponse = {
        resume: parsed,
        source_filename: parsed.source_filename || file.name,
        updated_at: null,
      };
      queryClient.setQueryData(resumeKey, next);
      const fresh = await getMyResume().catch(() => null);
      if (fresh?.resume) {
        queryClient.setQueryData(resumeKey, fresh);
      }
      await refreshRelatedProfile().catch(() => undefined);
      setUploadResult({ kind: "success" });
    } catch (error) {
      showUploadError(toAtsRequestError(error, copy.uploadFailed).detail);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadFile(file);
  };

  const openFilePicker = () => {
    setActionsOpen(false);
    setUploadResult(null);
    window.setTimeout(() => inputRef.current?.click(), 180);
  };

  const goToProfile = () => {
    setUploadResult(null);
    navigate(getLocalizedPath("/profile", language));
  };

  const removeCurrentCv = async () => {
    if (removing) return;
    setRemoving(true);
    setUploadError(null);
    try {
      await clearAccountData(userId);
      if (userId) sessionStorage.setItem(dismissedKey(userId), "1");
      queryClient.setQueryData(resumeKey, emptyResume);
      await refreshRelatedProfile();
      setConfirmRemove(false);
    } catch (error) {
      setUploadError(readAccountError(error, copy.removeCvError));
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing;

  const reuploadAction = (
    <CvMenuRow
      icon={<Upload className="h-4 w-4" />}
      iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
      label={uploading ? copy.uploading : copy.reuploadCv}
    />
  );
  const removeAction = (
    <CvMenuRow
      icon={<Trash2 className="h-4 w-4" />}
      iconClassName="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
      label={removing ? copy.removeCvWorking : copy.removeCv}
      destructive
    />
  );

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
            disabled={busy}
          />

          {user && resumeQuery.isPending && !resume ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : null}

          {resume ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileUp className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {filename || copy.savedTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploading ? copy.uploading : copy.uploaded}
                  </p>
                </div>
                {isMobile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={copy.cvActions}
                    onClick={() => setActionsOpen(true)}
                    className="h-8 w-8 shrink-0 bg-[#EDEDEE] text-foreground hover:bg-[#EDEDEE]/90 dark:bg-[#2D2D30] dark:hover:bg-[#3A3A3E]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={copy.cvActions}
                        className="h-8 w-8 shrink-0 bg-[#EDEDEE] text-foreground hover:bg-[#EDEDEE]/90 dark:bg-[#2D2D30] dark:hover:bg-[#3A3A3E]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="w-60 rounded-2xl border-0 bg-white p-1.5 shadow-xl dark:bg-[#2a2a2a]"
                    >
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={openFilePicker}
                        className="cursor-pointer rounded-xl p-0 focus:bg-gray-100 dark:focus:bg-white/10"
                      >
                        {reuploadAction}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => setConfirmRemove(true)}
                        className="cursor-pointer rounded-xl p-0 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30 dark:focus:text-red-400"
                      >
                        {removeAction}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ) : (
            <>
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
                disabled={busy}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/40 hover:bg-muted",
                  busy && "opacity-70",
                )}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileUp className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {uploading ? copy.uploading : copy.upload}
                </span>
                <span className="text-xs text-muted-foreground">
                  {copy.fileHint}
                </span>
              </button>
              {!resumeQuery.isPending && !loadError ? (
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">{copy.emptyTitle}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {copy.emptyBody}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}
        </div>
      </SettingsSectionCard>

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

      {isMobile ? (
        <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
          <DrawerContent className="border-none bg-white dark:bg-background">
            <DrawerHeader className="pb-8">
              <DrawerTitle>{filename || copy.savedTitle}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-1 px-3 pb-6">
              <button
                type="button"
                disabled={busy}
                onClick={openFilePicker}
                className="w-full rounded-xl transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/10"
              >
                {reuploadAction}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setActionsOpen(false);
                  setConfirmRemove(true);
                }}
                className="w-full rounded-xl transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
              >
                {removeAction}
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {isMobile ? (
        <Drawer
          open={uploadResult !== null}
          onOpenChange={(open) => {
            if (!open) setUploadResult(null);
          }}
        >
          <DrawerContent className="border-none bg-white dark:bg-background">
            <div className="flex justify-center px-6 pt-8">
              {uploadResult?.kind === "success" ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <DrawerHeader className="pb-8 pt-6">
              <DrawerTitle>
                {uploadResult?.kind === "success"
                  ? copy.uploadSuccessTitle
                  : copy.uploadFailureTitle}
              </DrawerTitle>
              <DrawerDescription className="mt-3 leading-relaxed">
                {uploadResult?.kind === "success"
                  ? copy.uploadSuccessBody
                  : uploadResult?.kind === "error"
                    ? uploadResult.message
                    : ""}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="px-6 pb-8 pt-2">
              {uploadResult?.kind === "success" ? (
                <Button type="button" onClick={goToProfile}>
                  {copy.viewProfile}
                </Button>
              ) : (
                <Button type="button" onClick={openFilePicker}>
                  {copy.reuploadCv}
                </Button>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={uploadResult !== null}
          onOpenChange={(open) => {
            if (!open) setUploadResult(null);
          }}
        >
          <DialogContent className="max-w-sm gap-0 p-8">
            <div className="mb-6 flex justify-center">
              {uploadResult?.kind === "success" ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <DialogHeader className="space-y-3">
              <DialogTitle>
                {uploadResult?.kind === "success"
                  ? copy.uploadSuccessTitle
                  : copy.uploadFailureTitle}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {uploadResult?.kind === "success"
                  ? copy.uploadSuccessBody
                  : uploadResult?.kind === "error"
                    ? uploadResult.message
                    : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-8 sm:space-x-0">
              {uploadResult?.kind === "success" ? (
                <Button type="button" className="w-full" onClick={goToProfile}>
                  {copy.viewProfile}
                </Button>
              ) : (
                <Button type="button" className="w-full" onClick={openFilePicker}>
                  {copy.reuploadCv}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={confirmRemove}
        onOpenChange={(open) => {
          if (!removing) setConfirmRemove(open);
        }}
      >
        <DialogContent className="max-w-sm gap-3">
          <DialogHeader className="space-y-1">
            <DialogTitle>{copy.removeCv}</DialogTitle>
            <DialogDescription>{copy.removeCvConfirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={removing}
              onClick={() => setConfirmRemove(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
              disabled={removing}
              onClick={() => void removeCurrentCv()}
            >
              {removing ? copy.removeCvWorking : copy.removeCvConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
