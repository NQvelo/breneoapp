import React, { useEffect, useState } from "react";
import { Plus, Share } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/contexts/LanguageContext";
import { subscribeIosInstallGuide } from "@/lib/pwaInstall";

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-breneo-blue/10 text-sm font-bold text-breneo-blue">
      {n}
    </span>
  );
}

function GuideSteps() {
  const t = useTranslation();
  const guide = t.settings.downloadApp.iosGuide;

  return (
    <ol className="space-y-5">
      <li className="flex items-start gap-3">
        <StepBadge n={1} />
        <p className="pt-1 text-[15px] leading-relaxed text-foreground">
          {guide.step1Before}
          <strong className="font-semibold">{guide.share}</strong>
          <Share
            className="mx-1 inline-block h-4 w-4 align-text-bottom text-breneo-blue"
            aria-hidden
          />
          {guide.step1After}
        </p>
      </li>
      <li className="flex items-start gap-3">
        <StepBadge n={2} />
        <p className="pt-1 text-[15px] leading-relaxed text-foreground">
          {guide.step2Before}
          <strong className="font-semibold">
            &ldquo;{guide.addToHomeScreen}&rdquo;
          </strong>
          <Plus
            className="mx-1 inline-block h-4 w-4 align-text-bottom text-breneo-blue"
            aria-hidden
          />
        </p>
      </li>
      <li className="flex items-start gap-3">
        <StepBadge n={3} />
        <p className="pt-1 text-[15px] leading-relaxed text-foreground">
          {guide.step3Before}
          <strong className="font-semibold">&ldquo;{guide.add}&rdquo;</strong>
          {guide.step3After}
        </p>
      </li>
    </ol>
  );
}

export function IosPwaInstallGuideModal() {
  const t = useTranslation();
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const guide = t.settings.downloadApp.iosGuide;

  useEffect(() => subscribeIosInstallGuide(setOpen), []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="border-none bg-white dark:bg-[#242424]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-xl font-bold text-foreground">
              {guide.title}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-6 pb-2 pt-2">
            <GuideSteps />
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button className="h-12 w-full rounded-full bg-breneo-blue text-base font-semibold text-white hover:bg-breneo-blue/90">
                {guide.gotIt}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none bg-white p-6 dark:bg-[#242424] sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            {guide.title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <GuideSteps />
        </div>

        <Button
          onClick={() => setOpen(false)}
          className="h-12 w-full rounded-full bg-breneo-blue text-base font-semibold text-white hover:bg-breneo-blue/90"
        >
          {guide.gotIt}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
