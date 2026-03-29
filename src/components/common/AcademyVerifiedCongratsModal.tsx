import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const STORAGE_KEY_PREFIX = "academy_verified_congrats_shown";

/**
 * Shows a congratulations modal when the academy becomes verified.
 * Only shown once per user (first time); state is stored in localStorage.
 * Syncs with `academyDisplay.is_verified` from auth (updated by profile/home/courses loads and refreshUser).
 */
export function AcademyVerifiedCongratsModal() {
  const { user, academyDisplay, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const prevVerifiedRef = useRef<boolean | undefined>(undefined);

  const isAcademy =
    user?.user_type === "academy" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "academy");
  const isVerified = academyDisplay?.is_verified === true;
  const userId = user?.id != null ? String(user.id) : null;
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : null;

  useEffect(() => {
    prevVerifiedRef.current = undefined;
  }, [storageKey]);

  useEffect(() => {
    if (!isAcademy || !storageKey) return;

    const nowVerified = isVerified === true;
    const prev = prevVerifiedRef.current;

    if (nowVerified) {
      try {
        const alreadyShown = localStorage.getItem(storageKey) === "true";
        if (!alreadyShown && (prev === undefined || prev === false)) {
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    }

    prevVerifiedRef.current = nowVerified ? true : false;
  }, [isAcademy, isVerified, storageKey]);

  /** Pick up verification soon after admin approves (tab focus / return to app). */
  useEffect(() => {
    if (!isAcademy) return;
    const sync = () => {
      void refreshUser();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", sync);
    };
  }, [isAcademy, refreshUser]);

  const handleOpenChange = (openState: boolean) => {
    if (!openState && storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        /* ignore */
      }
    }
    setOpen(openState);
  };

  if (!isAcademy) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Academy verified</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center py-4 px-2">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Congratulations!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your academy is now verified. Learners can trust your profile and
            you’ll stand out on the platform.
          </p>
          <Button onClick={() => handleOpenChange(false)} className="min-w-[140px]">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
