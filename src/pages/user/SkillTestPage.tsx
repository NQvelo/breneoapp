import React, { useState } from "react";
import {
  DynamicSkillTest,
  Question,
} from "@/components/skills/DynamicSkillTest";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2 } from "lucide-react";

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
    { index: 1, name: "Career" },
    { index: 2, name: "Tech" },
    { index: 3, name: "Soft" },
  ];

  const renderStep = (step: { index: number; name: string }) => {
    const isActive = stage >= step.index;
    const isCompleted = stage > step.index;
    return (
      <div className="flex-1 min-w-[80px] md:min-w-[120px]">
        <div
          className={`h-6 md:h-8 rounded-full transition-all duration-500 flex items-center justify-start px-3 md:px-4 gap-2 ${
            isCompleted
              ? "bg-green-500 dark:bg-green-600"
              : isActive
              ? "bg-[#01bfff]"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`text-xs md:text-sm font-semibold transition-colors duration-500 ${
              isActive || isCompleted
                ? "text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {step.name}
          </span>
          {isCompleted && (
            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-white flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[280px] md:max-w-[600px]">
      <div className="flex items-center gap-1.5 md:gap-2">
        {steps.map((step) => renderStep(step))}
      </div>
    </div>
  );
};

/* ----------------------------- Start Screen ----------------------------- */

const StartScreen = ({ onStart }: { onStart: () => void }) => {
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto">
      {/* Logo */}
      <div className="mb-8">
        {!logoLoaded && !imageError && (
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded flex items-center justify-center mx-auto mb-4">
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        )}

        {!imageError ? (
          <img
            src="/lovable-uploads/breneo_logo.png"
            alt="Breneo Logo"
            className={`h-10 mx-auto transition-opacity duration-300 ${
              logoLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => {
              setImageError(true);
              setLogoLoaded(true);
            }}
          />
        ) : (
          <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Breneo
            </span>
          </div>
        )}
      </div>

      {/* Card */}
      <div className="w-full p-8 bg-white dark:bg-card rounded-3xl border border-gray-200 dark:border-border">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center mb-4 shadow-md">
            <Play className="w-8 h-8 text-white" fill="white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">
            Skill Assessment Test
          </h1>
          <p className="text-base text-gray-600 dark:text-muted-foreground">
            This test will evaluate your abilities across three key areas.
          </p>
        </div>

        {/* Steps list */}
        <div className="space-y-3 mb-8">
          {[
            {
              title: "Interest Questions",
              desc: "Help us understand your career interests and preferences",
            },
            {
              title: "Tech Skills",
              desc: "Assess your technical knowledge and expertise",
            },
            {
              title: "Soft Skills",
              desc: "Evaluate your communication and interpersonal abilities",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-3xl border border-blue-100 dark:border-border bg-gradient-to-br from-blue-50 to-transparent dark:from-muted dark:to-transparent"
            >
              <div className="w-7 h-7 rounded-3xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Start Button */}
        <Button
          className="w-full text-white font-medium rounded-2xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] hover:opacity-90 h-12 text-base"
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
  const [testStarted, setTestStarted] = useState(false);
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );
  const [currentTechQ, setCurrentTechQ] = useState<Question | null>(null);
  const [currentSoftQ, setCurrentSoftQ] = useState<Question | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const layoutProps = {
    showSidebar: false,
    showHeader: false,
    background: "white" as const,
  };

  if (!testStarted) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#F8F9FA] dark:bg-[#181818]">
          <StartScreen onStart={() => setTestStarted(true)} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...layoutProps}>
      <div className="flex flex-col h-full w-full bg-[#F8F9FA] dark:bg-[#181818]">
        {/* Logo and Progress Bar - Top of page, Logo left, Progress right */}
        <div className="w-full flex items-center justify-between px-6 py-6 md:px-8 md:py-6">
          {/* Breneo Logo - Left */}
          <div className="flex-shrink-0">
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

          {/* Progress Bar - Right */}
          <div className="flex-shrink-0">
            <ProgressBar
              phase={phase}
              currentTechQ={currentTechQ}
              currentSoftQ={currentSoftQ}
            />
          </div>
        </div>

        {/* Test Content - Fully Stretched */}
        <div className="flex-1 w-full overflow-y-auto px-[15px] pb-[15px] pt-2">
          <div className="h-full w-full rounded-lg bg-white dark:bg-[#242424] p-8 md:p-[15rem] overflow-y-auto">
            <div className="max-w-xl mx-auto">
              <DynamicSkillTest
                onPhaseChange={setPhase}
                onTechQChange={setCurrentTechQ}
                onSoftQChange={setCurrentSoftQ}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SkillTestPage;
