"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { attemptService } from "@/services/attempt.service";
import { useViolation } from "@/hooks/useViolation";
import { Question } from "@/types";

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const id = Number(attemptId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(30);

  useViolation(id);

  // Per-question timer logic
  useEffect(() => {
    if (submittedScore !== null || questions.length === 0) return;

    if (questionTimeLeft <= 0) {
      handleNextQuestion();
      return;
    }

    const timer = setTimeout(() => {
      setQuestionTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [questionTimeLeft, questions.length, submittedScore]);

  useEffect(() => {
    attemptService.getQuestions(id).then((data) => {
      setQuestions(data);
    });
  }, [id]);

  async function saveAnswer(qId: number, value: string) {
    if (submittedScore !== null) return;
    setAnswers({ ...answers, [qId]: value });
    try {
      await attemptService.saveAnswer(id, {
        questionId: qId,
        answer: value,
      });
    } catch (err) {
      console.error("Failed to save answer", err);
    }
  }

  const handleNextQuestion = async () => {
    const currentQ = questions[currentIndex];
    // Ensure current answer is saved before moving on
    if (answers[currentQ.id]) {
      await saveAnswer(currentQ.id, answers[currentQ.id]);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionTimeLeft(30);
    } else {
      // Last question finished, submit the whole assessment
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (submittedScore !== null) return;
    try {
      const res = await attemptService.submit(id);
      setSubmittedScore(res.score);
    } catch (err) {
      console.error("Failed to submit assessment", err);
      alert("Failed to submit assessment. Please contact support.");
    }
  };

  if (submittedScore !== null) {
    // ... (Keep existing success UI)
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 p-8 rounded-xl border border-neutral-800 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Assessment Submitted!</h1>
          <p className="text-neutral-400 mb-8">Your responses have been recorded successfully.</p>
          
          <div className="bg-neutral-800/50 rounded-lg p-6 mb-8 border border-neutral-700">
            <p className="text-sm text-neutral-500 uppercase font-bold tracking-widest mb-1">Your Score</p>
            <p className="text-5xl font-black text-yellow-500">{submittedScore}</p>
          </div>

          <p className="text-sm text-neutral-500 mb-8 italic">
            Note: Your final result (Pass/Fail) will be available once published by the administrator.
          </p>

          <button
            onClick={() => router.push("/results")}
            className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
          >
            Go to My Results
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="animate-pulse">Loading questions...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div>
            <h1 className="text-xl font-bold">Question {currentIndex + 1} of {questions.length}</h1>
            <div className="w-full bg-neutral-800 h-1 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-500 h-full transition-all duration-1000" 
                style={{ width: `${(questionTimeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Time Remaining</p>
            <p className={`text-2xl font-black ${questionTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
              0:{questionTimeLeft.toString().padStart(2, "0")}
            </p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8 shadow-xl">
          <p className="text-xl font-medium mb-8 leading-relaxed">
            {currentQuestion.question_text}
          </p>

          {currentQuestion.question_type.toUpperCase() === "MCQ" ? (
            <div className="grid gap-4">
              {currentQuestion.options?.map((opt) => (
                <label 
                  key={opt.id} 
                  className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                    answers[currentQuestion.id] === opt.id 
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                    : 'bg-neutral-800 border-neutral-700 hover:border-neutral-500 text-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === opt.id}
                    onChange={() => saveAnswer(currentQuestion.id, opt.id)}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    answers[currentQuestion.id] === opt.id ? 'border-yellow-500' : 'border-neutral-500'
                  }`}>
                    {answers[currentQuestion.id] === opt.id && <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>}
                  </div>
                  {opt.text}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all"
              rows={6}
              placeholder="Type your answer here..."
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => {
                setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
              }}
              onBlur={(e) => saveAnswer(currentQuestion.id, e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleNextQuestion}
            className="bg-yellow-500 text-black px-10 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
          >
            {currentIndex === questions.length - 1 ? "Finish Assessment" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
}
