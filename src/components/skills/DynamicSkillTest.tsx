import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext"; // corrected relative path
import apiClient from "@/lib/api";

// Interfaces
interface Question {
  id?: number;
  text: string;
  skill?: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
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
}

export function DynamicSkillTest() {
  const { user } = useAuth(); // ✅ get current user
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );

  // State variables
  const [careerQuestions, setCareerQuestions] = useState<any[]>([]);
  const [careerIndex, setCareerIndex] = useState(0);
  const [careerAnswers, setCareerAnswers] = useState<any[]>([]);
  const [roleMapping, setRoleMapping] = useState<string | null>(null);

  const [techSession, setTechSession] = useState<any>(null);
  const [softSession, setSoftSession] = useState<any>(null);
  const [currentTechQ, setCurrentTechQ] = useState<Question | null>(null);
  const [currentSoftQ, setCurrentSoftQ] = useState<Question | null>(null);
  const [techDone, setTechDone] = useState(false);
  const [softDone, setSoftDone] = useState(false);
  const [results, setResults] = useState<Result | null>(null);

  const numQuestions = 5;

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

  // Career answer submission
  const submitCareerAnswer = (option: CareerOption) => {
    const question = careerQuestions[careerIndex];
    setCareerAnswers((prev) => [
      ...prev,
      { questionId: question.id, answer: option.text },
    ]);

    if (!roleMapping) setRoleMapping(option.RoleMapping);

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
      const techRes = await apiClient.post("/api/start-assessment/", {
        num_questions: numQuestions,
        RoleMapping: roleMapping,
      });
      const softRes = await apiClient.post("/api/soft/start/", {
        num_questions: numQuestions,
      });

      setTechSession(techRes.data);
      setSoftSession(softRes.data);
      setCurrentTechQ(techRes.data.questions[0]);
      setCurrentSoftQ(softRes.data.first_question);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit tech answer
  const submitTechAnswer = async (answer: string) => {
    if (!techSession || !currentTechQ) return;
    try {
      const res = await apiClient.post("/api/submit-answer/", {
        session_id: techSession.session_id,
        question_text: currentTechQ.text,
        answer,
      });
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
  const submitSoftAnswer = async (answer: string) => {
    if (!softSession || !currentSoftQ) return;
    try {
      const res = await apiClient.post("/api/soft/submit/", {
        session_id: softSession.session_id,
        question_text: currentSoftQ.text,
        answer,
      });
      if (res.data.next_question) {
        setCurrentSoftQ(res.data.next_question);
      } else {
        setSoftDone(true);
        setCurrentSoftQ(null);
        finishSoftAssessment();
      }
    } catch (err) {
      console.error(err);
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
  }, [techDone, softDone, results, user]);

  // ----- RENDER LOGIC -----
  if (phase === "career" && careerQuestions.length > 0) {
    const q = careerQuestions[careerIndex];
    return (
      <div className="p-8 max-w-xl mx-auto bg-white shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-4">🧭 Interest / Career Test</h1>
        <div className="text-gray-700 mb-2">
          Question {careerIndex + 1} of {careerQuestions.length}
        </div>
        <h2 className="mt-2 mb-4 text-lg font-semibold">{q.text}</h2>
        <div className="space-y-2">
          {q.options.map((opt: CareerOption) => (
            <button
              key={opt.id}
              className="block w-full px-4 py-2 border rounded hover:bg-gray-100 text-left"
              onClick={() => submitCareerAnswer(opt)}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!techSession || !softSession) {
    return <div className="p-8 text-center">Loading assessments...</div>;
  }

  if (currentTechQ) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-white shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-2">⚡ Tech Question</h2>
        <p className="text-gray-600 mb-4">{currentTechQ.text}</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              className="block w-full px-4 py-2 border rounded hover:bg-gray-100 text-left"
              onClick={() => submitTechAnswer(currentTechQ[`option${i}`])}
            >
              {currentTechQ[`option${i}`]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentSoftQ) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-white shadow-md rounded-md">
        <h2 className="text-xl font-bold mb-2">🌟 Soft Skills Question</h2>
        <p className="text-gray-600 mb-4">{currentSoftQ.text}</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              className="block w-full px-4 py-2 border rounded hover:bg-gray-100 text-left"
              onClick={() => submitSoftAnswer(currentSoftQ[`option${i}`])}
            >
              {currentSoftQ[`option${i}`]}
            </button>
          ))}
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
      <div className="p-8 max-w-xl mx-auto bg-white shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-4 text-green-600">
          🏆 ტესტი დასრულდა!
        </h1>
        <p className="mb-2">
          საერთო შედეგი: {totalScore} / {totalQuestions}
        </p>
        <p className="mb-4 font-semibold">Final Role: {finalRole}</p>

        <h3 className="font-semibold mb-2">📊 ქულები უნარების მიხედვით:</h3>
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

  return <div className="p-8 text-center">Loading...</div>;
}
