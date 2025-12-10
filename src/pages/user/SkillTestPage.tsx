import React, { useState } from "react";
import {
  DynamicSkillTest,
  Question,
} from "@/components/skills/DynamicSkillTest";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useMobile } from "@/hooks/use-mobile";

/* ----------------------------- Progress Bar ----------------------------- */

const ProgressBar = ({
  phase,
  currentTechQ,
  currentSoftQ,
}: {
  phase: "career" | "assessment" | "finished";
  currentTechQ: Question | null;
  currentSoftQ: Question | null;
}) => {
  const stage =
    phase === "career" ? 1 : phase === "assessment" && currentTechQ ? 2 : 3;

  const steps = [
    { index: 1, name: "Interests" },
    { index: 2, name: "Tech Skills" },
    { index: 3, name: "Soft Skills" },
  ];

  const renderStep = (step: { index: number; name: string }) => {
    const isActive = stage >= step.index;
    const isCompleted = stage > step.index;
    return (
      <div className="flex-1 flex flex-col items-center min-w-[80px] md:min-w-[120px]">
        <div
          className={`h-2 md:h-3 w-full rounded-full transition-all duration-500 flex items-center justify-center ${
            isCompleted
              ? "bg-green-500 dark:bg-green-600"
              : isActive
              ? "bg-[#01bfff]"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        ></div>
        <span
          className={`mt-2 text-xs md:text-sm font-semibold transition-colors duration-500 ${
            isCompleted
              ? "text-green-600 dark:text-green-400"
              : isActive
              ? "text-[#01bfff] dark:text-[#5AC9F8]"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {step.name}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[200px] md:max-w-[600px]">
      <div className="flex items-center justify-center gap-1.5 md:gap-2">
        {steps.map((step) => renderStep(step))}
      </div>
    </div>
  );
};

/* ----------------------------- Start Screen ----------------------------- */

const StartScreen = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="flex flex-col h-full md:h-auto w-full">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-40 h-40 md:w-56 md:h-56 mx-auto mb-8 flex items-center justify-center transition-all duration-500">
          <img
            src="/lovable-uploads/3dicons-target-dynamic-color.png"
            alt="Target"
            className="w-40 h-40 md:w-56 md:h-56 object-contain transition-transform duration-500 hover:scale-105"
          />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-4 transition-opacity duration-500">
          Skill Assessment Test
        </h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-opacity duration-500">
          Discover your strengths and unlock personalized career opportunities.
          Our comprehensive assessment evaluates your technical skills, soft
          skills, and career interests to provide tailored recommendations.
        </p>
      </div>

      {/* Start Button */}
      <div className="mt-auto md:mt-8 w-full flex justify-center">
        <Button
          className="w-full md:w-full px-12 text-white font-medium rounded-2xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90 h-12 text-base transition-all duration-300 hover:scale-105 active:scale-95"
          onClick={onStart}
        >
          Start the Test
        </Button>
      </div>
    </div>
  );
};

/* ----------------------------- Skill Test Page ----------------------------- */

const SkillTestPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const [testStarted, setTestStarted] = useState(false);
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );
  const [currentTechQ, setCurrentTechQ] = useState<Question | null>(null);
  const [currentSoftQ, setCurrentSoftQ] = useState<Question | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const isMobile = useMobile();

  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  const handleConfirmExit = () => {
    setIsCancelModalOpen(false);
    navigate(-1);
  };

  const handleStayHere = () => {
    setIsCancelModalOpen(false);
  };

  const layoutProps = {
    showSidebar: false,
    showHeader: false,
    background: "white" as const,
  };

  if (!testStarted) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="flex flex-col h-full w-full bg-[#F8F9FA] dark:bg-[#181818] animate-in fade-in duration-500">
          {/* Header: Logo, Progress Bar, Cancel Button - Same structure as test screen */}
          <div className="w-full grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center px-6 py-6 md:px-8 md:py-6 transition-all duration-300">
            {/* Breneo Logo - Left Column */}
            <div className="flex justify-start items-center">
              {!logoLoaded && !imageError && (
                <div className="h-8 w-8 md:w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded flex items-center justify-center">
                  <span className="text-xs text-gray-400 hidden md:inline">
                    Loading...
                  </span>
                </div>
              )}
              <img
                src="/lovable-uploads/breneo-only-logo.png"
                alt="Breneo Logo"
                className={`h-8 w-8 md:hidden transition-opacity duration-300 ${
                  logoLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setLogoLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setLogoLoaded(true);
                }}
              />
              <img
                src="/lovable-uploads/breneo_logo.png"
                alt="Breneo Logo"
                className={`hidden md:block h-8 transition-opacity duration-300 ${
                  logoLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setLogoLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setLogoLoaded(true);
                }}
              />
              {imageError && (
                <div className="h-8 w-8 md:w-28 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400 hidden md:inline">
                    Breneo
                  </span>
                </div>
              )}
            </div>

            {/* Empty Center Column (for consistency with test screen) */}
            <div className="flex justify-center items-center">
              {/* Empty on start screen */}
            </div>

            {/* Cancel Button - Right Column */}
            <div className="flex justify-end items-center">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="h-10 w-10 md:h-10 md:w-auto md:px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors p-0"
              >
                <X className="h-4 w-4" />
                <span className="hidden md:inline">{t.common.cancel}</span>
              </Button>
            </div>
          </div>

          {/* Content - Same container as test screen */}
          <div className="flex-1 w-full overflow-y-auto px-[15px] pb-[15px] pt-2">
            <div className="h-full w-full rounded-lg bg-white dark:bg-[#242424] p-8 md:py-8 md:px-[15rem] flex flex-col justify-center md:justify-center transition-opacity duration-500">
              <div className="max-w-xl mx-auto w-full h-full md:h-auto flex flex-col">
                <StartScreen onStart={() => setTestStarted(true)} />
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal - Start Screen */}
        {isMobile ? (
          <Drawer open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="text-center">Are you sure?</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                  Your progress will be lost if you exit the test.
                </p>
              </div>
              <DrawerFooter className="flex flex-col gap-2">
                <Button
                  onClick={handleStayHere}
                  className="w-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90"
                >
                  Stay Here
                </Button>
                <Button
                  onClick={handleConfirmExit}
                  variant="ghost"
                  className="w-full border-0"
                >
                  Exit
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your progress will be lost if you exit the test.
              </p>
              <DialogFooter className="flex flex-col gap-2">
                <Button
                  onClick={handleStayHere}
                  className="w-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90"
                >
                  Stay Here
                </Button>
                <Button
                  onClick={handleConfirmExit}
                  variant="ghost"
                  className="w-full border-0"
                >
                  Exit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...layoutProps}>
      <div className="flex flex-col h-full w-full bg-[#F8F9FA] dark:bg-[#181818] animate-in fade-in duration-500">
        {/* Header: Logo, Progress Bar, Cancel Button */}
        <div className="w-full grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center px-6 py-6 md:px-8 md:py-6 transition-all duration-300">
          {/* Breneo Logo - Left Column */}
          <div className="flex justify-start items-center">
            {!logoLoaded && !imageError && (
              <div className="h-8 w-8 md:w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded flex items-center justify-center">
                <span className="text-xs text-gray-400 hidden md:inline">
                  Loading...
                </span>
              </div>
            )}
            <img
              src="/lovable-uploads/breneo-only-logo.png"
              alt="Breneo Logo"
              className={`h-8 w-8 md:hidden transition-opacity duration-300 ${
                logoLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLogoLoaded(true)}
              onError={() => {
                setImageError(true);
                setLogoLoaded(true);
              }}
            />
            <img
              src="/lovable-uploads/breneo_logo.png"
              alt="Breneo Logo"
              className={`hidden md:block h-8 transition-opacity duration-300 ${
                logoLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLogoLoaded(true)}
              onError={() => {
                setImageError(true);
                setLogoLoaded(true);
              }}
            />
            {imageError && (
              <div className="h-8 w-8 md:w-28 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
                <span className="text-xs text-gray-600 dark:text-gray-400 hidden md:inline">
                  Breneo
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar - Center Column */}
          <div className="flex justify-center items-center">
            <ProgressBar
              phase={phase}
              currentTechQ={currentTechQ}
              currentSoftQ={currentSoftQ}
            />
          </div>

          {/* Cancel Button - Right Column */}
          <div className="flex justify-end items-center">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="h-10 w-10 md:h-10 md:w-auto md:px-3 rounded-full bg-gray-200 dark:bg-border/50 hover:bg-gray-300 dark:hover:bg-border/70 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors p-0"
            >
              <X className="h-4 w-4" />
              <span className="hidden md:inline">{t.common.cancel}</span>
            </Button>
          </div>
        </div>

        {/* Test Content - Fully Stretched */}
        <div className="flex-1 w-full overflow-y-auto px-[15px] pb-[15px] pt-2">
          <div className="h-full w-full rounded-lg bg-white dark:bg-[#242424] p-8 md:py-8 md:px-[15rem] flex flex-col justify-center md:justify-center transition-opacity duration-500">
            <div className="max-w-xl mx-auto w-full h-full md:h-auto flex flex-col transition-all duration-500">
              <DynamicSkillTest
                onPhaseChange={setPhase}
                onTechQChange={setCurrentTechQ}
                onSoftQChange={setCurrentSoftQ}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isMobile ? (
        <Drawer open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-center">Are you sure?</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Your progress will be lost if you exit the test.
              </p>
            </div>
            <DrawerFooter className="flex flex-col gap-2">
              <Button
                onClick={handleStayHere}
                className="w-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90"
              >
                Stay Here
              </Button>
              <Button
                onClick={handleConfirmExit}
                variant="ghost"
                className="w-full border-0"
              >
                Exit
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center">Are you sure?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
              Your progress will be lost if you exit the test.
            </p>
            <DialogFooter className="flex flex-col gap-2">
              <Button
                onClick={handleStayHere}
                className="w-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90"
              >
                Stay Here
              </Button>
              <Button
                onClick={handleConfirmExit}
                variant="ghost"
                className="w-full border-0"
              >
                Exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default SkillTestPage;
