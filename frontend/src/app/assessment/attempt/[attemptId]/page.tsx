"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { attemptService } from "@/services/attempt.service";
import { useViolation } from "@/hooks/useViolation";
import { Question } from "@/types";
import { notifyError, notifyInfo } from "@/lib/notify";

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const id = attemptId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [selectedSection, setSelectedSection] = useState<string>("Quantitative"); // Quantitative first by default

  useViolation(id);

  const sections = ["Quantitative", "Verbal", "Coding", "Logical"];

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submittedScore !== null) return;
    try {
      const res = await attemptService.submit(id);
      setSubmittedScore(res.score);
      if (isAuto) {
        notifyInfo("Time is up! Your assessment has been submitted automatically.");
      }
    } catch (err) {
      console.error("Failed to submit assessment", err);
      if (!isAuto) notifyError("Failed to submit assessment. Please contact support.");
    }
  }, [id, submittedScore]);

  // Overall timer logic
  useEffect(() => {
    if (submittedScore !== null || questions.length === 0) return;

    if (timeLeft <= 0) {
      setTimeout(() => handleSubmit(true), 0);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, questions.length, submittedScore, handleSubmit]);

  useEffect(() => {
    attemptService.getQuestions(id).then((data) => {
      setQuestions(data);
    });
  }, [id]);

  const filteredQuestions = questions.filter(q => q.section === selectedSection);

  async function saveAnswer(qId: string, value: string) {
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

  const handleNextQuestion = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (submittedScore !== null) {
    // ... success UI
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

  const currentQuestion = filteredQuestions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Section Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => {
                  setSelectedSection(section);
                  setCurrentIndex(0);
                }}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                  selectedSection === section
                    ? "bg-yellow-500 text-black border-yellow-500"
                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-8 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded border border-yellow-500/30">
                  {currentQuestion?.section}
                </span>
                <h1 className="text-xl font-bold">Question {currentIndex + 1} of {filteredQuestions.length}</h1>
              </div>
              <div className="w-full bg-neutral-800 h-1 mt-2 rounded-full overflow-hidden">
                <div 
                  className="bg-yellow-500 h-full transition-all duration-1000" 
                  style={{ width: `${(timeLeft / (60 * 60)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Overall Time Remaining</p>
              <p className={`text-2xl font-black ${timeLeft <= 300 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8 shadow-xl min-h-[400px]">
            {currentQuestion ? (
              <>
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 italic">
                No questions in this section.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              className="bg-neutral-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-neutral-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <div className="flex gap-4">
              {currentIndex === filteredQuestions.length - 1 ? (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to submit the entire assessment?")) {
                      handleSubmit();
                    }
                  }}
                  className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-green-500 transition-all shadow-lg"
                >
                  Submit Assessment
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="bg-yellow-500 text-black px-10 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-lg"
                >
                  Next Question →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl sticky top-6">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {filteredQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${
                    currentIndex === idx
                      ? 'bg-yellow-500 text-black border-yellow-500'
                      : answers[q.id]
                        ? 'bg-green-500/20 text-green-500 border-green-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-3 h-3 bg-neutral-800 border border-neutral-700 rounded"></div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Current</span>
              </div>
            </div>

            <button
              onClick={() => handleSubmit()}
              className="w-full mt-8 bg-neutral-800 text-white py-3 rounded-xl text-sm font-bold border border-neutral-700 hover:bg-red-600 hover:border-red-500 transition-all"
            >
              Quit Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
