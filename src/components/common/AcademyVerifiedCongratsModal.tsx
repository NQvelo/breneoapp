import React, { useEffect, useState } from "react";
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
 */
export function AcademyVerifiedCongratsModal() {
  const { user, academyDisplay } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  const isAcademy =
    user?.user_type === "academy" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("userRole") === "academy");
  const isVerified = academyDisplay?.is_verified === true;
  const userId = user?.id != null ? String(user.id) : null;
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : null;

  useEffect(() => {
    if (!isAcademy || !isVerified || !storageKey || checked) return;

    try {
      const alreadyShown = localStorage.getItem(storageKey) === "true";
      if (!alreadyShown) {
        setOpen(true);
      }
    } finally {
      setChecked(true);
    }
  }, [isAcademy, isVerified, storageKey, checked]);

  const handleClose = (openState: boolean) => {
    if (!openState && storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // ignore
      }
    }
    setOpen(openState);
  };

  if (!isAcademy) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <Button onClick={() => handleClose(false)} className="min-w-[140px]">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
