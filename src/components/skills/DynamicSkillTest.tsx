import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext"; // corrected relative path
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

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
  const [selectedTechAnswer, setSelectedTechAnswer] = useState<string | null>(
    null
  );
  const [selectedSoftAnswer, setSelectedSoftAnswer] = useState<string | null>(
    null
  );

  const numQuestions = 5;

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
    if (!user) return;
    try {
      await apiClient.post("/api/save-test-results/", {
        userId: user.id,
        ...resultsToSave,
      });
    } catch (err) {
      console.error("Error saving test results:", err);
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
    const res = await apiClient.post("/api/finish-assessment/", {
      session_id: techSession.session_id,
    });
    setResults((prev) => ({ ...prev, tech: res.data }));
  };

  const finishSoftAssessment = async () => {
    if (!softSession) return;
    const res = await apiClient.post("/api/soft/finish/", {
      session_id: softSession.session_id,
    });
    setResults((prev) => ({ ...prev, soft: res.data }));
  };

  // Render skill results helper
  const renderSkillResults = (skills: Record<string, string>) =>
    Object.entries(skills)
      .filter(([_, pct]) => parseFloat(pct.replace("%", "")) > 0)
      .map(([skill, pct]) => {
        const percentage = parseFloat(pct.replace("%", ""));
        const status = percentage >= 70 ? "✅ Strong" : "❌ Weak";
        return (
          <li key={skill} className="mb-1">
            {skill} – {pct} → {status}
          </li>
        );
      });

  // Save final results when both assessments are done
  useEffect(() => {
    if (techDone && softDone && results && user) {
      const totalScore =
        (results.tech?.total_score || 0) + (results.soft?.total_score || 0);
      const totalQuestions =
        (results.tech?.total_questions || 0) +
        (results.soft?.total_questions || 0);
      const finalRole =
        results.soft?.final_role || results.tech?.final_role || "N/A";

      const resultsToSave = {
        totalScore,
        totalQuestions,
        finalRole,
        techScorePerSkill: results.tech?.score_per_skill,
        softScorePerSkill: results.soft?.score_per_skill,
        careerAnswers,
      };

      saveTestResults(resultsToSave);
      setPhase("finished");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techDone, softDone, results, user]);

  // ----- RENDER LOGIC -----
  if (phase === "career" && careerQuestions.length > 0) {
    const q = careerQuestions[careerIndex];
    return (
      <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
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
      <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border text-center dark:text-foreground">
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
      <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
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
        <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
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
      <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
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

  if (phase === "finished" && results) {
    const totalScore =
      (results.tech?.total_score || 0) + (results.soft?.total_score || 0);
    const totalQuestions =
      (results.tech?.total_questions || 0) +
      (results.soft?.total_questions || 0);
    const finalRole =
      results.soft?.final_role || results.tech?.final_role || "N/A";

    return (
      <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border">
        <h1 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
          🏆 ტესტი დასრულდა!
        </h1>
        <p className="mb-2 dark:text-foreground">
          საერთო შედეგი: {totalScore} / {totalQuestions}
        </p>
        <p className="mb-4 font-semibold dark:text-foreground">
          Final Role: {finalRole}
        </p>

        <h3 className="font-semibold mb-2 dark:text-foreground">
          📊 ქულები უნარების მიხედვით:
        </h3>
        <ul className="list-disc list-inside mb-2">
          {results.tech?.score_per_skill &&
            renderSkillResults(results.tech.score_per_skill)}
        </ul>
        <ul className="list-disc list-inside">
          {results.soft?.score_per_skill &&
            renderSkillResults(results.soft.score_per_skill)}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto bg-white dark:bg-card rounded-md border border-gray-200 dark:border-border text-center dark:text-foreground">
      Loading...
    </div>
  );
}
