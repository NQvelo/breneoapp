import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext"; // corrected relative path
import apiClient from "@/api/auth/apiClient";
import { Button } from "@/components/ui/button";
import { ChevronRight, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Interfaces
export interface Question {
  id?: number;
  questiontext?: string; // API returns this field for soft skills
  text?: string;
  question?: string; // Alternative field name for question text
  skill?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correct_option?: string;
  difficulty?: string;
  RoleMapping?: string;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow any additional properties
}

interface CareerOption {
  id: number;
  text: string;
  RoleMapping: string;
}

interface Result {
  total_score?: number;
  total_questions?: number;
  final_role?: string;
  score_per_skill?: Record<string, string>;
  results?: Record<
    string,
    {
      percentage: string;
      recommendation: string;
    }
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tech?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  soft?: any;
}

interface DynamicSkillTestProps {
  onPhaseChange?: (phase: "career" | "assessment" | "finished") => void;
  onTechQChange?: (question: Question | null) => void;
  onSoftQChange?: (question: Question | null) => void;
}

export function DynamicSkillTest({
  onPhaseChange,
  onTechQChange,
  onSoftQChange,
}: DynamicSkillTestProps = {}) {
  const { user } = useAuth(); // ✅ get current user
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );

  // State variables
  const [careerQuestions, setCareerQuestions] = useState<any[]>([]);
  const [careerIndex, setCareerIndex] = useState(0);
  const [careerAnswers, setCareerAnswers] = useState<any[]>([]);
  const [roleMapping, setRoleMapping] = useState<string | null>(null);
  const [selectedCareerAnswer, setSelectedCareerAnswer] = useState<
    string | null
  >(null);

  const [techSession, setTechSession] = useState<any>(null);
  const [softSession, setSoftSession] = useState<any>(null);
  const [currentTechQ, setCurrentTechQ] = useState<Question | null>(null);
  const [currentSoftQ, setCurrentSoftQ] = useState<Question | null>(null);
  const [techDone, setTechDone] = useState(false);
  const [softDone, setSoftDone] = useState(false);
  const [results, setResults] = useState<Result | null>(null);
  const [isCalculatingResults, setIsCalculatingResults] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [selectedTechAnswer, setSelectedTechAnswer] = useState<string | null>(
    null
  );
  const [selectedSoftAnswer, setSelectedSoftAnswer] = useState<string | null>(
    null
  );

  const numQuestions = 5;

  // Loading messages to display during calculation
  const loadingMessages = [
    "📊 ვითვლით თქვენს შედეგებს...",
    "🧮 ვიწყებთ ანალიზს...",
    "💡 ვადგენთ უნარებს...",
    "🎯 ვპოულობთ საუკეთესო მატჩს...",
    "✨ თითქმის მზადაა...",
  ];

  // Cycle through loading messages
  useEffect(() => {
    if (isCalculatingResults) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % 5);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCalculatingResults]);

  // Notify parent of phase changes
  useEffect(() => {
    if (onPhaseChange) {
      onPhaseChange(phase);
    }
  }, [phase, onPhaseChange]);

  // Notify parent of tech question changes
  useEffect(() => {
    if (onTechQChange) {
      onTechQChange(currentTechQ);
    }
  }, [currentTechQ, onTechQChange]);

  // Notify parent of soft question changes
  useEffect(() => {
    if (onSoftQChange) {
      onSoftQChange(currentSoftQ);
    }
  }, [currentSoftQ, onSoftQChange]);

  // Load career questions
  useEffect(() => {
    if (phase === "career") {
      apiClient
        .get(`/api/career-questions-random/?limit=${numQuestions}`)
        .then((res) => setCareerQuestions(res.data))
        .catch((err) => console.error(err));
    }
  }, [phase]);

  // Save test results
  const saveTestResults = async (resultsToSave: any) => {
    if (!user) {
      console.warn("No user found, cannot save test results");
      return;
    }
    try {
      console.log("💾 Saving test results for user:", user.id);
      console.log("💾 Raw test results data:", resultsToSave);

      // Validate and convert to numbers
      const totalScore = Number(resultsToSave.total_score);
      const totalQuestions = Number(resultsToSave.total_questions);

      console.log("🔍 Validation check:");
      console.log(
        "  - Total Score (raw):",
        resultsToSave.total_score,
        "Type:",
        typeof resultsToSave.total_score
      );
      console.log(
        "  - Total Questions (raw):",
        resultsToSave.total_questions,
        "Type:",
        typeof resultsToSave.total_questions
      );
      console.log(
        "  - Total Score (converted):",
        totalScore,
        "isNaN:",
        isNaN(totalScore)
      );
      console.log(
        "  - Total Questions (converted):",
        totalQuestions,
        "isNaN:",
        isNaN(totalQuestions)
      );

      // Validate values are numbers
      if (isNaN(totalScore) || isNaN(totalQuestions)) {
        console.error("❌ Invalid score values detected!");
        console.error(
          "  - total_score:",
          resultsToSave.total_score,
          "→",
          totalScore
        );
        console.error(
          "  - total_questions:",
          resultsToSave.total_questions,
          "→",
          totalQuestions
        );
      }

      // Clean and prepare payload - ensure all fields are defined and serializable
      // Combine tech and soft skills into skills_json as required by backend
      const skillsJson = {
        tech: resultsToSave.tech_score_per_skill || {},
        soft: resultsToSave.soft_score_per_skill || {},
      };

      const payload = {
        user: user.id,
        total_score: totalScore, // Use converted number
        total_questions: totalQuestions, // Use converted number
        final_role: resultsToSave.final_role || "N/A",
        skills_json: skillsJson, // Required field by Django backend
        career_answers: resultsToSave.career_answers || [],
      };

      console.log(
        "📦 Final payload being sent:",
        JSON.stringify(payload, null, 2)
      );
      console.log("📦 Payload types:", {
        user: typeof payload.user,
        total_score: typeof payload.total_score,
        total_questions: typeof payload.total_questions,
        final_role: typeof payload.final_role,
      });

      // Send data with user ID to Django backend
      const response = await apiClient.post("/api/skilltest/save/", payload);

      console.log("✅ Test results saved successfully!");
      console.log("✅ Response:", response.data);
      console.log("✅ Saved total_score:", payload.total_score);
      console.log("✅ Saved total_questions:", payload.total_questions);
    } catch (err: any) {
      console.error("❌ Error saving test results:");
      console.error("Full error object:", err);

      // Log axios error details
      if (err.response) {
        console.error("❌ Response status:", err.response.status);
        console.error(
          "❌ Response data:",
          JSON.stringify(err.response.data, null, 2)
        );
        console.error("❌ Response headers:", err.response.headers);
      } else if (err.request) {
        console.error("❌ No response received:", err.request);
      } else {
        console.error("❌ Error setting up request:", err.message);
      }
    }
  };

  // Career answer selection
  const selectCareerAnswer = (option: CareerOption) => {
    setSelectedCareerAnswer(option.text);
    if (!roleMapping) setRoleMapping(option.RoleMapping);
  };

  // Career answer submission
  const submitCareerAnswer = () => {
    if (!selectedCareerAnswer) return;

    const question = careerQuestions[careerIndex];
    setCareerAnswers((prev) => [
      ...prev,
      { questionId: question.id, answer: selectedCareerAnswer },
    ]);

    setSelectedCareerAnswer(null);

    if (careerIndex + 1 < careerQuestions.length) {
      setCareerIndex(careerIndex + 1);
    } else {
      setPhase("assessment");
      startAssessments();
    }
  };

  // Start tech & soft assessments
  const startAssessments = async () => {
    try {
      console.log("🚀 Starting assessments...");

      // Start tech assessment
      console.log("⚡ Starting tech assessment with params:", {
        num_questions: numQuestions,
        RoleMapping: roleMapping,
      });

      const techRes = await apiClient.post("/api/start-assessment/", {
        num_questions: numQuestions,
        RoleMapping: roleMapping,
      });

      console.log("✅ Tech Response:", techRes.data);
      setTechSession(techRes.data);
      setCurrentTechQ(techRes.data.questions[0]);

      // Start soft skills assessment
      console.log("🌟 Starting SOFT SKILLS assessment with params:", {
        num_questions: numQuestions,
      });

      const softRes = await apiClient.post("/api/soft/start/", {
        num_questions: numQuestions,
      });

      console.log("✅ SOFT SKILLS API Response - Full Data:", softRes.data);
      console.log("🔍 SOFT SKILLS Response Keys:", Object.keys(softRes.data));

      setSoftSession(softRes.data);

      // Deep debug of soft response structure
      console.log("🔍 SOFT SKILLS - Response Details:", {
        session_id: softRes.data?.session_id,
        first_question: softRes.data?.first_question,
        questions: softRes.data?.questions,
        question: softRes.data?.question,
        text: softRes.data?.text,
        option1: softRes.data?.option1,
        option2: softRes.data?.option2,
        option3: softRes.data?.option3,
        option4: softRes.data?.option4,
        hasQuestionsArray: Array.isArray(softRes.data?.questions),
        questionsLength: softRes.data?.questions?.length,
      });

      // Try multiple possible response structures
      let softQuestion = null;

      if (softRes.data.first_question) {
        console.log(
          "✅ Found first_question field:",
          softRes.data.first_question
        );
        softQuestion = softRes.data.first_question;
      } else if (softRes.data.questions && softRes.data.questions[0]) {
        console.log(
          "✅ Found questions array, using first item:",
          softRes.data.questions[0]
        );
        softQuestion = softRes.data.questions[0];
      } else if (softRes.data.question) {
        console.log("✅ Found question field:", softRes.data.question);
        softQuestion = softRes.data.question;
      } else {
        console.log(
          "⚠️ No question found in expected fields, using full response:",
          softRes.data
        );
        softQuestion = softRes.data;
      }

      console.log("🔍 Setting soft question to:", softQuestion);
      console.log(
        "🔍 Soft question has keys:",
        Object.keys(softQuestion || {})
      );

      setCurrentSoftQ(softQuestion);

      console.log("✅ Assessments started successfully");
    } catch (err) {
      console.error("❌ Error starting assessments:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
      }
    }
  };

  // Submit tech answer
  const submitTechAnswer = async () => {
    if (!techSession || !currentTechQ || !selectedTechAnswer) return;
    try {
      const res = await apiClient.post("/api/submit-answer/", {
        session_id: techSession.session_id,
        question_text: currentTechQ.text,
        answer: selectedTechAnswer,
      });
      setSelectedTechAnswer(null);
      if (res.data.next_question) {
        setCurrentTechQ(res.data.next_question);
      } else {
        setTechDone(true);
        setCurrentTechQ(null);
        finishTechAssessment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit soft answer
  const submitSoftAnswer = async () => {
    if (!softSession || !currentSoftQ || !selectedSoftAnswer) return;
    try {
      console.log("🔍 Submitting soft answer:", {
        session: softSession,
        sessionId: softSession?.session_id,
        currentQuestion: currentSoftQ,
        currentQuestionKeys: currentSoftQ ? Object.keys(currentSoftQ) : [],
        answer: selectedSoftAnswer,
      });

      // Get the question text from various possible fields
      const questionText =
        currentSoftQ.questiontext ||
        currentSoftQ.text ||
        currentSoftQ.question ||
        "";

      console.log("🔍 Question text being sent:", questionText);

      const requestPayload = {
        session_id: softSession.session_id,
        question_text: questionText,
        answer: selectedSoftAnswer,
      };

      console.log("🔍 Request payload:", requestPayload);

      const res = await apiClient.post("/api/soft/submit/", requestPayload);

      console.log("🔍 Soft answer response:", res.data);

      setSelectedSoftAnswer(null);

      if (res.data.next_question) {
        console.log("✅ Got next question:", res.data.next_question);
        setCurrentSoftQ(res.data.next_question);
      } else {
        console.log("✅ Soft questions completed");
        setSoftDone(true);
        setCurrentSoftQ(null);
        finishSoftAssessment();
      }
    } catch (err) {
      console.error("❌ Error submitting soft answer:", err);
      // Log the full error details
      if (err instanceof Error) {
        console.error("Error details:", err.message);
      }
    }
  };

  const finishTechAssessment = async () => {
    if (!techSession) return;
    try {
      console.log(
        "🔍 Finishing tech assessment with session:",
        techSession.session_id
      );
      const res = await apiClient.post("/api/finish-assessment/", {
        session_id: techSession.session_id,
      });
      console.log("✅ Tech assessment finish response:", res.data);
      console.log("✅ Tech response keys:", Object.keys(res.data));
      console.log("✅ Tech total_score:", res.data.total_score);
      console.log("✅ Tech total_questions:", res.data.total_questions);
      setResults((prev) => ({ ...prev, tech: res.data }));
    } catch (err) {
      console.error("❌ Error finishing tech assessment:", err);
    }
  };

  const finishSoftAssessment = async () => {
    if (!softSession) return;
    try {
      console.log(
        "🔍 Finishing soft assessment with session:",
        softSession.session_id
      );
      const res = await apiClient.post("/api/soft/finish/", {
        session_id: softSession.session_id,
      });
      console.log("✅ Soft assessment finish response:", res.data);
      console.log("✅ Soft response keys:", Object.keys(res.data));
      console.log("✅ Soft total_score:", res.data.total_score);
      console.log("✅ Soft total_questions:", res.data.total_questions);
      setResults((prev) => ({ ...prev, soft: res.data }));
    } catch (err) {
      console.error("❌ Error finishing soft assessment:", err);
    }
  };

  // Render skill results helper with visual progress bars
  const renderSkillResults = (skills: Record<string, string>) =>
    Object.entries(skills)
      .filter(([_, pct]) => parseFloat(pct.replace("%", "")) > 0)
      .map(([skill, pct]) => {
        const percentage = parseFloat(pct.replace("%", ""));
        const isStrong = percentage >= 70;
        return (
          <div
            key={skill}
            className="mb-3 p-3 bg-gray-50 dark:bg-muted rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium dark:text-foreground">
                {skill}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-foreground">
                  {pct}
                </span>
                {isStrong ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>
            <Progress
              value={percentage}
              className={`h-2 ${
                isStrong
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-orange-100 dark:bg-orange-900/30"
              }`}
            />
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
              {isStrong ? "Strong" : "Needs Improvement"}
            </div>
          </div>
        );
      });

  // Save final results when both assessments are done
  useEffect(() => {
    if (techDone && softDone && results && user) {
      // Start loading state
      setIsCalculatingResults(true);
      setLoadingMessageIndex(0);

      // Debug logging
      console.log("🔍 Full results object:", results);
      console.log("🔍 Tech results:", results.tech);
      console.log("🔍 Soft results:", results.soft);

      // Extract scores - try from API response first, fallback to calculating from score_per_skill
      let techScore = results.tech?.total_score;
      let softScore = results.soft?.total_score;
      let techQuestions = results.tech?.total_questions;
      let softQuestions = results.soft?.total_questions;

      // If backend doesn't provide scores, calculate from skill percentages
      if (!techScore && results.tech?.score_per_skill) {
        console.log("⚡ Calculating tech score from skill percentages");
        const skillScores = Object.values(results.tech.score_per_skill).map(
          (pct: string) => parseFloat(pct.replace("%", ""))
        );
        const avgScore =
          skillScores.reduce((sum, val) => sum + val, 0) / skillScores.length;
        techScore = Math.round((avgScore * numQuestions) / 100);
        techQuestions = numQuestions;
        console.log(
          "⚡ Calculated tech score:",
          techScore,
          "from avg percentage:",
          avgScore
        );
      }

      if (!softScore && results.soft?.score_per_skill) {
        console.log("🌟 Calculating soft score from skill percentages");
        const skillScores = Object.values(results.soft.score_per_skill).map(
          (pct: string) => parseFloat(pct.replace("%", ""))
        );
        const avgScore =
          skillScores.reduce((sum, val) => sum + val, 0) / skillScores.length;
        softScore = Math.round((avgScore * numQuestions) / 100);
        softQuestions = numQuestions;
        console.log(
          "🌟 Calculated soft score:",
          softScore,
          "from avg percentage:",
          avgScore
        );
      }

      // Use defaults if still undefined
      techScore = techScore || 0;
      softScore = softScore || 0;
      techQuestions = techQuestions || 0;
      softQuestions = softQuestions || 0;

      console.log("📊 Final score extraction:");
      console.log("  - Tech Score:", techScore, "Questions:", techQuestions);
      console.log("  - Soft Score:", softScore, "Questions:", softQuestions);

      const totalScore = techScore + softScore;
      const totalQuestions = techQuestions + softQuestions;

      console.log("📊 Calculated totals:");
      console.log("  - Total Score:", totalScore);
      console.log("  - Total Questions:", totalQuestions);

      // Validate the values are actual numbers
      if (isNaN(totalScore) || isNaN(totalQuestions) || totalQuestions === 0) {
        console.error("❌ Invalid calculated values:", {
          totalScore,
          totalQuestions,
        });
        console.error("❌ Trying to save with numQuestions:", numQuestions * 2);
        // Fallback to using known question count
        const fallbackQuestions = numQuestions * 2; // career + tech + soft (we have 2 main assessments)
        const fallbackScore = totalScore || 0;
        console.log("❌ Using fallback values:", {
          fallbackScore,
          fallbackQuestions,
        });
      }

      const finalRole =
        results.soft?.final_role || results.tech?.final_role || "N/A";

      // Prepare data in snake_case for Django backend
      const resultsToSave = {
        total_score: totalScore || 0,
        total_questions: totalQuestions || numQuestions * 2,
        final_role: finalRole,
        tech_score_per_skill: results.tech?.score_per_skill || {},
        soft_score_per_skill: results.soft?.score_per_skill || {},
        career_answers: careerAnswers,
      };

      console.log("📊 Final results to save:", resultsToSave);
      console.log("📊 Type check:", {
        total_score_type: typeof resultsToSave.total_score,
        total_questions_type: typeof resultsToSave.total_questions,
        total_score_value: resultsToSave.total_score,
        total_questions_value: resultsToSave.total_questions,
      });

      // Wait 5 seconds before saving and showing results
      setTimeout(() => {
        console.log("✅ 5 seconds passed, saving results now");
        saveTestResults(resultsToSave);
        setIsCalculatingResults(false);
        setPhase("finished");
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techDone, softDone, results, user]);

  // ----- RENDER LOGIC -----
  if (phase === "career" && careerQuestions.length > 0) {
    const q = careerQuestions[careerIndex];
    return (
      <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
        {/* <h1 className="text-2xl font-bold mb-4">🧭 Interest / Career Test</h1> */}
        {/* <div className="text-gray-700 mb-2">
          Question {careerIndex + 1} of {careerQuestions.length}
        </div> */}
        <h2 className="mt-2 mb-4 text-xl font-semibold text-gray-800 dark:text-foreground">
          {q.text}
        </h2>
        <div className="space-y-3">
          {q.options.map((opt: CareerOption, index: number) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedCareerAnswer === opt.text;
            return (
              <button
                key={opt.id}
                className={`w-full px-4 py-3 rounded-lg border flex items-center gap-3 transition-all ${
                  isSelected
                    ? "bg-[#00afea]/10 dark:bg-[#00afea]/20 border-[#00afea] dark:border-[#5AC9F8]"
                    : "bg-[#eff9fc] dark:bg-[rgba(26,38,51,0.3)] border-blue-200 dark:border-gray-700 hover:border-[#00afea]/50 dark:hover:border-[#00afea]"
                }`}
                onClick={() => selectCareerAnswer(opt)}
              >
                <div
                  className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "bg-[#00afea] dark:bg-[#5AC9F8]"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isSelected
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {letter}
                  </span>
                </div>
                <span
                  className={`flex-1 text-left ${
                    isSelected
                      ? "text-[#00afea] dark:text-[#5AC9F8] font-medium"
                      : "text-gray-700 dark:text-foreground"
                  }`}
                >
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={submitCareerAnswer}
            disabled={!selectedCareerAnswer}
            className="h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90 flex items-center justify-center gap-2 px-8"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!techSession || !softSession) {
    console.log("⏳ Waiting for sessions...", {
      hasTechSession: !!techSession,
      hasSoftSession: !!softSession,
      techSession: techSession,
      softSession: softSession,
    });
    return (
      <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border text-center dark:text-foreground">
        Loading assessments...
      </div>
    );
  }

  // Debug logging for render state
  console.log("🔍 Render State:", {
    hasCurrentTechQ: !!currentTechQ,
    hasCurrentSoftQ: !!currentSoftQ,
    techDone,
    softDone,
    currentTechQData: currentTechQ,
    currentSoftQData: currentSoftQ,
  });

  if (currentTechQ) {
    return (
      <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
        {/* <h2 className="text-xl font-bold mb-2">⚡ Tech Question</h2> */}
        <p className="text-xl font-semibold text-gray-800 dark:text-foreground mb-4">
          {currentTechQ.text}
        </p>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => {
            const option = currentTechQ[`option${i}`];
            if (option) {
              const letter = String.fromCharCode(64 + i); // A, B, C, D
              const isSelected = selectedTechAnswer === option;
              return (
                <button
                  key={i}
                  className={`w-full px-4 py-3 rounded-lg border flex items-center gap-3 transition-all ${
                    isSelected
                      ? "bg-[#00afea]/10 dark:bg-[#00afea]/20 border-[#00afea] dark:border-[#5AC9F8]"
                      : "bg-[#eff9fc] dark:bg-muted border-blue-200 dark:border-border hover:border-[#00afea]/50 dark:hover:border-[#00afea]"
                  }`}
                  onClick={() => setSelectedTechAnswer(option)}
                >
                  <div
                    className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-[#00afea] dark:bg-[#5AC9F8]"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isSelected
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {letter}
                    </span>
                  </div>
                  <span
                    className={`flex-1 text-left ${
                      isSelected
                        ? "text-[#00afea] dark:text-[#5AC9F8] font-medium"
                        : "text-gray-700 dark:text-foreground"
                    }`}
                  >
                    {option}
                  </span>
                </button>
              );
            }
            return null;
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={submitTechAnswer}
            disabled={!selectedTechAnswer}
            className="h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90 flex items-center justify-center gap-2 px-8"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (currentSoftQ) {
    // Debug check if soft question has the expected structure
    console.log("🌟 RENDERING SOFT QUESTION - Raw Data:", currentSoftQ);
    console.log(
      "🌟 RENDERING SOFT QUESTION - Has Keys:",
      Object.keys(currentSoftQ)
    );
    console.log("🌟 RENDERING SOFT QUESTION - Values:", {
      questiontext: currentSoftQ.questiontext,
      text: currentSoftQ.text,
      question: currentSoftQ.question,
      option1: currentSoftQ.option1,
      option2: currentSoftQ.option2,
      option3: currentSoftQ.option3,
      option4: currentSoftQ.option4,
      hasQuestiontext: !!currentSoftQ.questiontext,
      hasText: !!currentSoftQ.text,
      hasQuestion: !!currentSoftQ.question,
      hasOptions: !!(
        currentSoftQ.option1 ||
        currentSoftQ.option2 ||
        currentSoftQ.option3 ||
        currentSoftQ.option4
      ),
    });

    // Get the question text from various possible fields
    const questionText =
      currentSoftQ.questiontext ||
      currentSoftQ.text ||
      currentSoftQ.question ||
      "Question text unavailable";

    // Check if we have options, if not show error message
    const hasOptions =
      currentSoftQ.option1 ||
      currentSoftQ.option2 ||
      currentSoftQ.option3 ||
      currentSoftQ.option4;

    if (!hasOptions) {
      return (
        <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
          <h2 className="text-xl font-bold mb-2 dark:text-foreground">
            ⚠️ Error Loading Question
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            The question data structure is incomplete.
          </p>
          <pre className="text-xs bg-gray-100 dark:bg-muted text-gray-800 dark:text-foreground p-4 overflow-auto">
            {JSON.stringify(currentSoftQ, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
        {/* <h2 className="text-xl font-bold mb-2">🌟 Soft Skills Question</h2> */}
        <p className="text-xl font-semibold text-gray-800 dark:text-foreground mb-4">
          {questionText}
        </p>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => {
            const option = currentSoftQ[`option${i}`];
            if (option) {
              const letter = String.fromCharCode(64 + i); // A, B, C, D
              const isSelected = selectedSoftAnswer === option;
              return (
                <button
                  key={i}
                  className={`w-full px-4 py-3 rounded-lg border flex items-center gap-3 transition-all ${
                    isSelected
                      ? "bg-[#00afea]/10 dark:bg-[#00afea]/20 border-[#00afea] dark:border-[#5AC9F8]"
                      : "bg-[#eff9fc] dark:bg-muted border-blue-200 dark:border-border hover:border-[#00afea]/50 dark:hover:border-[#00afea]"
                  }`}
                  onClick={() => setSelectedSoftAnswer(option)}
                >
                  <div
                    className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-[#00afea] dark:bg-[#5AC9F8]"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isSelected
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {letter}
                    </span>
                  </div>
                  <span
                    className={`flex-1 text-left ${
                      isSelected
                        ? "text-[#00afea] dark:text-[#5AC9F8] font-medium"
                        : "text-gray-700 dark:text-foreground"
                    }`}
                  >
                    {option}
                  </span>
                </button>
              );
            }
            return null;
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={submitSoftAnswer}
            disabled={!selectedSoftAnswer}
            className="h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90 flex items-center justify-center gap-2 px-8"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show loading screen while calculating results
  if (isCalculatingResults) {
    return (
      <div className="max-w-4xl mx-auto mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-8">
              <div className="h-32 w-32 rounded-full border-4 border-[#00afea]/20 animate-pulse"></div>
              <div className="absolute top-0 left-0 h-32 w-32 rounded-full border-4 border-transparent border-t-[#00afea] animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Award className="h-12 w-12 text-[#00afea]" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[#00afea] mb-4 text-center">
              {loadingMessages[loadingMessageIndex]}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              ვამუშავებთ თქვენს პასუხებს და ვახერხებთ საუკეთესო რეკომენდაციას
            </p>
            <div className="mt-8 w-full max-w-md">
              <Progress
                value={
                  ((loadingMessageIndex + 1) / loadingMessages.length) * 100
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "finished" && results) {
    const totalScore =
      (results.tech?.total_score || 0) + (results.soft?.total_score || 0);
    const totalQuestions =
      (results.tech?.total_questions || 0) +
      (results.soft?.total_questions || 0);
    const finalRole =
      results.soft?.final_role || results.tech?.final_role || "N/A";

    const hasTechResults =
      results.tech?.score_per_skill &&
      Object.keys(results.tech.score_per_skill).length > 0;
    const hasSoftResults =
      results.soft?.score_per_skill &&
      Object.keys(results.soft.score_per_skill).length > 0;

    return (
      <div className="p-8 max-w-4xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
        {/* Celebration Header */}
        <div className="text-center pb-6 mb-6 border-b border-gray-200 dark:border-border">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Award className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-green-700 dark:text-green-300 mb-2">
            ტესტი დასრულდა! 🎉
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            გილოცავთ! თქვენ დაასრულეთ უნარების ტესტი
          </p>
        </div>

        {/* Final Role Section */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            რეკომენდაცია
          </h2>
          <div className="text-center bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <Badge
              variant="default"
              className="text-lg px-6 py-3 bg-blue-600 hover:bg-blue-700"
            >
              {finalRole}
            </Badge>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              ამ როლისთვის რეკომენდირებული როლი
            </p>
          </div>
        </div>

        {/* Skills Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Technical Skills */}
          {hasTechResults && (
            <div className="bg-gray-50 dark:bg-muted/50 p-6 rounded-lg border border-gray-200 dark:border-border">
              <h3 className="text-lg font-semibold mb-4 dark:text-foreground flex items-center gap-2">
                ⚡ ტექნიკური უნარები
              </h3>
              {results.tech?.score_per_skill &&
                renderSkillResults(results.tech.score_per_skill)}
            </div>
          )}

          {/* Soft Skills */}
          {hasSoftResults && (
            <div className="bg-gray-50 dark:bg-muted/50 p-6 rounded-lg border border-gray-200 dark:border-border">
              <h3 className="text-lg font-semibold mb-4 dark:text-foreground flex items-center gap-2">
                🌟 რბილი უნარები
              </h3>
              {results.soft?.score_per_skill &&
                renderSkillResults(results.soft.score_per_skill)}
            </div>
          )}
        </div>

        {/* Empty State */}
        {!hasTechResults && !hasSoftResults && (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              ქულები დაზუსტების პროცესშია
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto mb-8 bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border text-center dark:text-foreground">
      Loading...
    </div>
  );
}
