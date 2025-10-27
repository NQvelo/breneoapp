import React, { useState } from "react";
import {
  DynamicSkillTest,
  Question,
} from "@/components/skills/DynamicSkillTest";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

// Progress Bar Component
const ProgressBar = ({
  phase,
  currentTechQ,
  currentSoftQ,
}: {
  phase: "career" | "assessment" | "finished";
  currentTechQ: Question | null;
  currentSoftQ: Question | null;
}) => {
  // Determine current stage (1, 2, or 3)
  let currentStage = 0;
  let stageName = "";

  if (phase === "career") {
    currentStage = 1;
    stageName = "Interest Questions";
  } else if (phase === "assessment" && currentTechQ) {
    currentStage = 2;
    stageName = "Tech Skills";
  } else if (phase === "assessment" && currentSoftQ) {
    currentStage = 3;
    stageName = "Soft Skills";
  } else if (phase === "finished") {
    currentStage = 3;
    stageName = "Complete!";
  }

  const stages = [
    { number: 1, label: "Interest Questions" },
    { number: 2, label: "Tech Skills" },
    { number: 3, label: "Soft Skills" },
  ];

  return (
    <div className="mb-8 max-w-xl mx-auto">
      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between">
          {/* Stage 1 */}
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ease-in-out ${
                currentStage >= 1
                  ? "bg-[#01bfff] text-white scale-110 shadow-lg dark:shadow-blue-500/20"
                  : "bg-gray-200 dark:bg-muted text-gray-500 dark:text-muted-foreground"
              }`}
            >
              <span className="transition-all duration-300">
                {currentStage > 1 ? "✓" : "1"}
              </span>
            </div>
            <span
              className={`text-xs mt-2 text-center transition-all duration-300 ${
                currentStage >= 1
                  ? "text-[#01bfff] font-semibold dark:text-[#5AC9F8]"
                  : "text-gray-500 dark:text-muted-foreground"
              }`}
            >
              Interest
            </span>
          </div>

          {/* Connector Line 1 */}
          <div
            className={`flex-1 h-1 mx-2 transition-all duration-500 ease-in-out ${
              currentStage > 1 ? "bg-[#01bfff]" : "bg-gray-200 dark:bg-muted"
            }`}
          ></div>

          {/* Stage 2 */}
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ease-in-out ${
                currentStage >= 2
                  ? "bg-[#01bfff] text-white scale-110 shadow-lg dark:shadow-blue-500/20"
                  : "bg-gray-200 dark:bg-muted text-gray-500 dark:text-muted-foreground"
              }`}
            >
              <span className="transition-all duration-300">
                {currentStage > 2 ? "✓" : "2"}
              </span>
            </div>
            <span
              className={`text-xs mt-2 text-center transition-all duration-300 ${
                currentStage >= 2
                  ? "text-[#01bfff] font-semibold dark:text-[#5AC9F8]"
                  : "text-gray-500 dark:text-muted-foreground"
              }`}
            >
              Tech Skills
            </span>
          </div>

          {/* Connector Line 2 */}
          <div
            className={`flex-1 h-1 mx-2 transition-all duration-500 ease-in-out ${
              currentStage > 2 ? "bg-[#01bfff]" : "bg-gray-200 dark:bg-muted"
            }`}
          ></div>

          {/* Stage 3 */}
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ease-in-out ${
                currentStage >= 3
                  ? "bg-[#01bfff] text-white scale-110 shadow-lg dark:shadow-blue-500/20"
                  : "bg-gray-200 dark:bg-muted text-gray-500 dark:text-muted-foreground"
              }`}
            >
              <span className="transition-all duration-300">
                {currentStage > 3 ? "✓" : "3"}
              </span>
            </div>
            <span
              className={`text-xs mt-2 text-center transition-all duration-300 ${
                currentStage >= 3
                  ? "text-[#01bfff] font-semibold dark:text-[#5AC9F8]"
                  : "text-gray-500 dark:text-muted-foreground"
              }`}
            >
              Soft Skills
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Start Screen Component
const StartScreen = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto mb-12">
      <div className="w-full p-8 mb-12 bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border">
        {/* Header Section - Centered */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-white" fill="white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">
            Skill Assessment Test
          </h1>
          <p className="text-base text-gray-600 dark:text-muted-foreground">
            This test will evaluate your abilities across three key areas
          </p>
        </div>

        {/* Sections List - Left Aligned */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-100 dark:border-border bg-gradient-to-br from-blue-50 to-transparent dark:from-muted dark:to-transparent transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-foreground mb-1">
                Interest Questions
              </h3>
              <p className="text-sm text-gray-600 dark:text-muted-foreground">
                Help us understand your career interests and preferences
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-100 dark:border-border bg-gradient-to-br from-blue-50 to-transparent dark:from-muted dark:to-transparent transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-foreground mb-1">
                Tech Skills
              </h3>
              <p className="text-sm text-gray-600 dark:text-muted-foreground">
                Assess your technical knowledge and expertise
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-100 dark:border-border bg-gradient-to-br from-blue-50 to-transparent dark:from-muted dark:to-transparent transition-all">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#01bfff] to-[#0088cc] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-foreground mb-1">
                Soft Skills
              </h3>
              <p className="text-sm text-gray-600 dark:text-muted-foreground">
                Evaluate your communication and interpersonal abilities
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="mb-6">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full bg-[#01bfff] hover:bg-[#01bfff]/90 dark:bg-[#5AC9F8] dark:hover:bg-[#5AC9F8]/90 text-white font-semibold"
          >
            <Play />
            Start Test
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-gray-500 dark:text-muted-foreground">
          Please answer all questions honestly. The test will take approximately
          10-15 minutes.
        </p>
      </div>
    </div>
  );
};

const SkillTestPage = () => {
  const [testStarted, setTestStarted] = useState(false);
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );
  const [currentTechQ, setCurrentTechQ] = useState<Question | null>(null);
  const [currentSoftQ, setCurrentSoftQ] = useState<Question | null>(null);

  if (!testStarted) {
    return (
      <DashboardLayout>
        <div className="p">
          <StartScreen onStart={() => setTestStarted(true)} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Progress Bar */}
        <ProgressBar
          phase={phase}
          currentTechQ={currentTechQ}
          currentSoftQ={currentSoftQ}
        />
        {/* <h1 className="text-2xl font-bold text-breneo-navy mb-6">Skill Assessment</h1> */}
        <DynamicSkillTest
          onPhaseChange={setPhase}
          onTechQChange={setCurrentTechQ}
          onSoftQChange={setCurrentSoftQ}
        />
      </div>
    </DashboardLayout>
  );
};

export default SkillTestPage;
