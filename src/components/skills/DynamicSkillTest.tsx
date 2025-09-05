import React, { useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface Question {
  text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
}

interface Result {
  total_score?: number;
  total_questions?: number;
  score?: number;
  score_per_skill?: Record<string, number>;
}

export function DynamicSkillTest() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const startAssessment = () => {
    setIsLoading(true);
    axios
      .post("https://breneo.onrender.com/api/start-assessment/", {
        num_questions:10
      })
      .then((res) => {
        setSessionId(res.data.session_id);
        setQuestions(res.data.questions);
        setCurrentIndex(0);
        setCurrentQuestion(res.data.questions[0]);
        setFinished(false);
        setResult(null);
      })
      .catch((err) => console.error("Start error:", err))
      .finally(() => setIsLoading(false));
  };


  const submitAnswer = (answer: string) => {
    if (!sessionId || !currentQuestion) return;
    setIsLoading(true);

    axios
      .post("https://breneo.onrender.com/api/submit-answer/", {
        session_id: sessionId,
        question_text: currentQuestion.text,
        answer: answer,
      })
      .then(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(currentIndex + 1);
          setCurrentQuestion(questions[currentIndex + 1]);
        } else {
          finishAssessment();
        }
      })
      .catch((err) => console.error("Submit error:", err))
      .finally(() => setIsLoading(false));
  };

 
  const finishAssessment = () => {
    axios
      .post("https://breneo.onrender.com/api/finish-assessment/", {
        session_id: sessionId,
      })
      .then((res) => {
        setResult(res.data);
        setFinished(true);
        setCurrentQuestion(null);
      })
      .catch((err) => console.error("Finish error:", err));
  };

 
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  
  return (
    <div className="max-w-2xl mx-auto p-4">
      {!sessionId && !finished && (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-breneo-navy mb-4">
            AI-Powered Dynamic Skill Assessment
          </h2>
          <p className="text-gray-600 mb-6">
            This personalized test adapts based on your answers, using AI to
            generate relevant questions that help identify your strengths and
            career potential.
          </p>
          <Button
            onClick={startAssessment}
            disabled={isLoading}
            className="bg-breneo-blue hover:bg-breneo-blue/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Test...
              </>
            ) : (
              "Start Assessment"
            )}
          </Button>
        </Card>
      )}

      {currentQuestion && !finished && (
        <div>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Dynamic Skill Assessment</h2>
              <span className="text-sm text-gray-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="p-6">
            <h3 className="text-xl font-medium mb-6">
              {currentQuestion.text}
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => {
                const option =
                  currentQuestion[`option${i}` as keyof Question] as string;
                return (
                  <Button
                    key={i}
                    onClick={() => submitAnswer(option)}
                    disabled={isLoading}
                    variant="outline"
                    className="block w-full text-left"
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {finished && result && (
        <Card className="p-8 bg-green-50">
          <h2 className="text-xl font-bold text-green-600">
            ✅ ტესტი დასრულდა!
          </h2>
          <p className="mt-2">
            საერთო შედეგი:{" "}
            <strong>
              {result.total_score !== undefined
                ? `${result.total_score} / ${result.total_questions}`
                : result.score || "მონაცემი არ არის"}
            </strong>
          </p>

          <p className="mt-4">📊 ქულები უნარების მიხედვით:</p>
          {result.score_per_skill &&
          Object.keys(result.score_per_skill).length > 0 ? (
            <ul className="list-disc pl-6">
              {Object.entries(result.score_per_skill).map(([skill, score]) => (
                <li key={skill}>
                  {skill}: {score}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">მონაცემი არ არის</p>
          )}

          <Button
            onClick={startAssessment}
            className="mt-6 bg-breneo-blue hover:bg-breneo-blue/90"
          >
            🔄 თავიდან დაწყება
          </Button>
        </Card>
      )}
    </div>
  );
}
