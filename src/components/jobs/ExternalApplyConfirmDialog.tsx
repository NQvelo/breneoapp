import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import {
  recordExternalJobApplication,
  type ExternalJobSnapshot,
} from "@/api/jobs/jobApplicationsApi";
import { MY_APPLICATIONS_QUERY_KEY } from "@/hooks/useMyApplications";
import {
  clearPendingExternalApply,
  hasPendingExternalApply,
} from "@/lib/pendingExternalApply";
import { useTranslation } from "@/contexts/LanguageContext";

interface ExternalApplyConfirmDialogProps {
  jobId: string;
  /** Logged in, job loaded, and it is an external (fetched) job. */
  enabled: boolean;
  alreadyApplied: boolean;
  getSnapshot: () => ExternalJobSnapshot;
}

/**
 * Asks "Did you apply?" when the user returns from an external apply page
 * (see `markExternalApplyStarted`). Yes → saved to Applied Jobs; No → nothing.
 */
export function ExternalApplyConfirmDialog({
  jobId,
  enabled,
  alreadyApplied,
  getSnapshot,
}: ExternalApplyConfirmDialogProps) {
  const t = useTranslation();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const leftPageRef = useRef(false);

  const shouldPrompt = useCallback(
    () => enabled && !alreadyApplied && hasPendingExternalApply(jobId),
    [enabled, alreadyApplied, jobId],
  );

  useEffect(() => {
    if (!enabled) return;
    if (alreadyApplied && hasPendingExternalApply(jobId)) {
      clearPendingExternalApply();
      return;
    }
    // Came back to this page via navigation / reload after leaving to the apply site.
    if (shouldPrompt()) setOpen(true);
  }, [enabled, alreadyApplied, jobId, shouldPrompt]);

  useEffect(() => {
    if (!enabled) return;
    // Apply page opened in a new tab: prompt once this tab is visible again.
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (hasPendingExternalApply(jobId)) leftPageRef.current = true;
        return;
      }
      if (leftPageRef.current && shouldPrompt()) {
        leftPageRef.current = false;
        setOpen(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, jobId, shouldPrompt]);

  const confirmMutation = useMutation({
    mutationFn: () => recordExternalJobApplication(jobId, getSnapshot()),
    onSuccess: () => {
      clearPendingExternalApply();
      setOpen(false);
      toast.success(t.jobs.applied);
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATIONS_QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message || t.jobs.markApplyFailed);
    },
  });

  const handleNo = () => {
    clearPendingExternalApply();
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmMutation.isPending) handleNo();
  };

  const illustration = (
    <img
      src="/lovable-uploads/jobs-3d.png"
      alt=""
      className="h-32 w-32 object-contain"
    />
  );

  const noButton = (
    <Button
      type="button"
      variant="secondary"
      className={isMobile ? "w-full" : "flex-1"}
      onClick={handleNo}
      disabled={confirmMutation.isPending}
    >
      {t.common.no}
    </Button>
  );

  const yesButton = (
    <Button
      type="button"
      className={isMobile ? "w-full" : "flex-1"}
      onClick={() => confirmMutation.mutate()}
      disabled={confirmMutation.isPending}
    >
      {confirmMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        t.common.yes
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="border-none bg-white dark:bg-background">
          <DrawerHeader className="items-start pb-2 text-left">
            {/* pl-11 offsets the header's close button (h-7 + gap-4) so the image is centered in the drawer */}
            <div className="mb-3 flex justify-center pl-11">{illustration}</div>
            <DrawerTitle>{t.jobs.didYouApplyTitle}</DrawerTitle>
            <DrawerDescription className="mt-1">
              {t.jobs.didYouApplyDescription}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex-col gap-2 pt-2">
            {yesButton}
            {noButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  const buttons = (
    <>
      {noButton}
      {yesButton}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-3">
        <div className="flex justify-center">{illustration}</div>
        <DialogHeader className="space-y-1 text-left sm:text-left">
          <DialogTitle>{t.jobs.didYouApplyTitle}</DialogTitle>
          <DialogDescription>{t.jobs.didYouApplyDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-2 sm:space-x-0">
          {buttons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
