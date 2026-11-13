import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearAccountData,
  deleteAccount,
  readAccountError,
} from "@/api/profile/accountDataApi";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { SettingsActionRow, SettingsSubsection } from "./SettingsSectionUi";

type AccountDataAction = "clean" | "remove";

export function AccountDataActions() {
  const t = useTranslation();
  const copy = t.settings.accountPage;
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const [pending, setPending] = useState<AccountDataAction | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (!busy) setPending(null);
  };

  const run = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      if (pending === "clean") {
        await clearAccountData(user?.id != null ? String(user.id) : "");
        await Promise.all([
          refreshUser(),
          queryClient.invalidateQueries({ queryKey: ["profile"] }),
          queryClient.invalidateQueries({ queryKey: ["profileSkills"] }),
          queryClient.invalidateQueries({ queryKey: ["job-match"] }),
          queryClient.invalidateQueries({ queryKey: ["job-matches"] }),
          queryClient.invalidateQueries({ queryKey: ["myResume"] }),
        ]);
        toast.success(copy.cleanDataSuccess);
        setPending(null);
        return;
      }

      await deleteAccount();
      setPending(null);
      logout();
    } catch (error) {
      toast.error(
        readAccountError(
          error,
          pending === "clean" ? copy.cleanDataError : copy.removeAccountError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    pending === "remove" ? copy.removeAccount : copy.cleanData;
  const description =
    pending === "remove"
      ? copy.removeAccountConfirmDescription
      : copy.cleanDataConfirmDescription;
  const confirmLabel = busy
    ? pending === "remove"
      ? copy.removeAccountWorking
      : copy.cleanDataWorking
    : pending === "remove"
      ? copy.removeAccountConfirm
      : copy.cleanDataConfirm;

  const confirmButtons = (
    <>
      <Button
        type="button"
        variant="secondary"
        className="flex-1"
        disabled={busy}
        onClick={close}
      >
        {t.common.cancel}
      </Button>
      <Button
        type="button"
        className="flex-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
        disabled={busy}
        onClick={() => void run()}
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <>
      <SettingsSubsection title={copy.data}>
        <SettingsActionRow
          label={copy.cleanData}
          description={copy.cleanDataDesc}
          destructive
          disabled={busy}
          onClick={() => setPending("clean")}
        />
        <SettingsActionRow
          label={copy.removeAccount}
          description={copy.removeAccountDesc}
          destructive
          disabled={busy}
          onClick={() => setPending("remove")}
        />
      </SettingsSubsection>

      {isMobile ? (
        <Drawer open={pending !== null} onOpenChange={(open) => !open && close()}>
          <DrawerContent className="border-none bg-white dark:bg-background">
            <DrawerHeader className="pb-0">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="mt-1">
                {description}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row gap-2 pt-10">
              {confirmButtons}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={pending !== null} onOpenChange={(open) => !open && close()}>
          <DialogContent className="max-w-sm gap-0">
            <DialogHeader className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row gap-2 pt-10 sm:space-x-0">
              {confirmButtons}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
