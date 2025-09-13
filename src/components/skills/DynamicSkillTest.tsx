import React, { useState, useEffect } from "react";
import axios from "axios";

interface Question {
  id?: number;
  text: string;
  skill?: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
}

interface Result {
  total_score?: number;
  total_questions?: number;
  final_role?: string;
  results?: Record<
    string,
    {
      percentage: string;
      recommendation: string;
    }
  >;
}

export function DynamicSkillTest() {
  const [phase, setPhase] = useState<"career" | "assessment" | "finished">(
    "career"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [careerQuestions, setCareerQuestions] = useState<any[]>([]);
  const [careerIndex, setCareerIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [careerAnswers, setCareerAnswers] = useState<any[]>([]);
  const [roleMapping, setRoleMapping] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [numQuestions] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  // ==== Load career questions ====
  useEffect(() => {
    if (phase === "career") {
      axios
        .get("http://127.0.0.1:8000/api/career-questions-random/?limit=5")
        .then((res) => setCareerQuestions(res.data))
        .catch((err) => console.error(err));
    }
  }, [phase]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitCareerAnswer = (option: any) => {
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
      startAssessment(option.RoleMapping);
    }
  };

  const startAssessment = (role: string) => {
    axios
      .post("http://127.0.0.1:8000/api/start-assessment/", {
        num_questions: numQuestions,
        RoleMapping: role,
      })
      .then((res) => {
        setSessionId(res.data.session_id);
        setCurrentQuestion(res.data.questions[0]);
        setCurrentIndex(0);
      })
      .catch((err) => console.error(err));
  };

  const submitAnswer = (answer: string) => {
    if (!sessionId || !currentQuestion) return;

    axios
      .post("http://127.0.0.1:8000/api/submit-answer/", {
        session_id: sessionId,
        question_text: currentQuestion.text,
        answer,
      })
      .then((res) => {
        if (!res.data.next_question || currentIndex + 1 >= numQuestions) {
          finishAssessment();
        } else {
          setCurrentQuestion(res.data.next_question);
          setCurrentIndex((prev) => prev + 1);
        }
      })
      .catch((err) => console.error(err));
  };

  const finishAssessment = () => {
    axios
      .post("http://127.0.0.1:8000/api/finish-assessment/", {
        session_id: sessionId,
      })
      .then((res) => {
        setResult(res.data);
        setPhase("finished");
        setCurrentQuestion(null);
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* ===== Phase Titles ===== */}
      {phase === "career" && (
        <h1 className="text-2xl font-bold mb-6">🎯 Interest Assessment</h1>
      )}
      {phase === "assessment" && (
        <h1 className="text-2xl font-bold mb-6">⚡ Skill Assessment</h1>
      )}
      {phase === "finished" && (
        <h1 className="text-2xl font-bold mb-6 text-green-600">
          🏆 Final Results
        </h1>
      )}

      {/* Career Phase */}
      {phase === "career" && careerQuestions.length > 0 && (
        <div>
          <div>
            Question {careerIndex + 1} of {careerQuestions.length}
          </div>
          <h2 className="mt-2 font-semibold">
            {careerQuestions[careerIndex].text}
          </h2>
          {careerQuestions[careerIndex].options.map((opt: any) => (
            <button
              key={opt.id}
              onClick={() => submitCareerAnswer(opt)}
              className="block w-full my-2 px-4 py-2 border rounded hover:bg-gray-200"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* Assessment Phase */}
      {phase === "assessment" && currentQuestion && (
        <div>
          <div>
            Question {currentIndex + 1} of {numQuestions}
          </div>
          <p className="text-gray-600 mb-2">
            <strong>Skill:</strong> {currentQuestion.skill}
          </p>
          <h2 className="mt-2 font-semibold">{currentQuestion.text}</h2>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              className="block w-full my-2 px-4 py-2 border rounded hover:bg-gray-200"
              onClick={() => submitAnswer(currentQuestion[`option${i}`])}
            >
              {currentQuestion[`option${i}`]}
            </button>
          ))}
        </div>
      )}

      {/* Result Phase */}
      {phase === "finished" && result && (
        <div className="mt-6 p-4 border rounded bg-gray-100">
          <p className="mt-2 font-medium">
            საერთო შედეგი: {result.total_score} / {result.total_questions}
          </p>

          <p className="mt-2 font-medium">
            <strong>Final Role:</strong> {result.final_role || "N/A"}
          </p>

          {result.results && Object.keys(result.results).length > 0 && (
            <div className="mt-4">
              <p className="font-medium">📊 ქულები უნარების მიხედვით:</p>
              <ul className="ml-4 list-disc">
                {Object.entries(result.results)
                  .filter(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ([, data]) => parseFloat((data as any).percentage) > 0
                  )
                  .map(([skill, data]) => (
                    <li key={skill}>
                      {skill} – {(data as any).percentage} (threshold: 70%) →{" "}
                      <strong>{(data as any).recommendation}</strong>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              setPhase("career");
              setCareerIndex(0);
              setCareerAnswers([]);
              setRoleMapping(null);
              setResult(null);
              setSessionId(null);
              setCurrentQuestion(null);
            }}
          >
            🔄 თავიდან დაწყება
          </button>
        </div>
      )}
    </div>
  );
}
