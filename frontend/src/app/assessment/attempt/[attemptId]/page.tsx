"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { attemptService } from "@/services/attempt.service";
import { useViolation } from "@/hooks/useViolation";
import { Question } from "@/types";
import { notifyError, notifyInfo } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";

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

  const {
    violationCount,
    requireFullscreen,
    requestAssessmentFullscreen,
  } = useViolation(id);

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
  const sectionIndex = sections.indexOf(selectedSection);
  const nextSection =
    sectionIndex >= 0 && sectionIndex < sections.length - 1
      ? sections[sectionIndex + 1]
      : null;
  const isLastQuestionInSection =
    filteredQuestions.length > 0 && currentIndex === filteredQuestions.length - 1;
  const isSectionBoundary = filteredQuestions.length === 0 || isLastQuestionInSection;

  useEffect(() => {
    const hasQuestionsInSelectedSection = questions.some((q) => q.section === selectedSection);
    if (questions.length > 0 && !hasQuestionsInSelectedSection) {
      const firstSectionWithQuestions = sections.find((section) =>
        questions.some((q) => q.section === section)
      );
      if (firstSectionWithQuestions) {
        setSelectedSection(firstSectionWithQuestions);
        setCurrentIndex(0);
      }
    }
  }, [questions, selectedSection]);

  useEffect(() => {
    if (currentIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions.length, currentIndex]);

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

  const handleNextSection = () => {
    if (!nextSection) return;
    setSelectedSection(nextSection);
    setCurrentIndex(0);
  };

  if (submittedScore !== null) {
    // ... success UI
    // ... (Keep existing success UI)
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 p-8 rounded-xl border border-zinc-700 text-center shadow-2xl">
          <div className="w-20 h-20 bg-amber-400/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Assessment Submitted!</h1>
          <p className="text-zinc-400 mb-8">Your responses have been recorded successfully.</p>
          
          <div className="bg-zinc-800/60 rounded-lg p-6 mb-8 border border-zinc-600">
            <p className="text-sm text-zinc-400 uppercase font-bold tracking-widest mb-1">Your Score</p>
            <p className="text-5xl font-black text-amber-400">{submittedScore}</p>
          </div>

          <p className="text-sm text-zinc-400 mb-8 italic">
            Note: Your final result (Pass/Fail) will be available once published by the administrator.
          </p>

          <button
            onClick={() => router.push("/results")}
            className="w-full bg-amber-400 text-black py-4 rounded-xl font-bold hover:bg-amber-300 transition-colors"
          >
            Go to My Results
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="animate-pulse">Loading questions...</p>
      </div>
    );
  }

  const currentQuestion = filteredQuestions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {requireFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-600 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Fullscreen Required</h2>
            <p className="text-sm text-zinc-300 mb-6">
              You exited fullscreen mode. To continue the assessment, re-enter fullscreen.
            </p>
            <button
              onClick={requestAssessmentFullscreen}
              className="w-full bg-amber-400 text-black py-3 rounded-xl font-bold hover:bg-amber-300 transition-all"
            >
              Go Fullscreen
            </button>
            <p className="text-xs text-zinc-400 mt-3">
              This popup will close only after fullscreen is enabled.
            </p>
          </div>
        </div>
      )}
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
                    ? "bg-amber-400 text-black border-amber-400"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-8 bg-zinc-900 p-4 rounded-xl border border-zinc-700">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-400/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-400/30">
                  {currentQuestion?.section}
                </span>
                <h1 className="text-xl font-bold">Question {currentIndex + 1} of {filteredQuestions.length}</h1>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  violationCount >= 2
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : "bg-zinc-800 text-zinc-300 border-zinc-600"
                }`}>
                  Violations: {violationCount}/3
                </span>
              </div>
              <div className="w-full bg-zinc-700 h-1 mt-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full transition-all duration-1000" 
                  style={{ width: `${(timeLeft / (60 * 60)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Overall Time Remaining</p>
              <p className={`text-2xl font-black ${timeLeft <= 300 ? 'text-red-300 animate-pulse' : 'text-amber-300'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 mb-8 shadow-xl min-h-[400px]">
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
                          ? 'bg-amber-400/10 border-amber-400 text-amber-300' 
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-200'
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
                          answers[currentQuestion.id] === opt.id ? 'border-amber-400' : 'border-zinc-500'
                        }`}>
                          {answers[currentQuestion.id] === opt.id && <div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>}
                        </div>
                        {opt.text}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all text-zinc-100"
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
              <div className="flex items-center justify-center h-full text-zinc-400 italic">
                No questions in this section.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              className="bg-zinc-800 text-zinc-100 px-8 py-3 rounded-xl font-bold border border-zinc-600 hover:bg-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <div className="flex gap-4">
              {isSectionBoundary ? (
                nextSection ? (
                  <button
                    onClick={handleNextSection}
                    className="bg-amber-300 text-black px-10 py-3 rounded-xl font-bold hover:bg-amber-200 transition-all shadow-lg"
                  >
                    Next Section -&gt;
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const confirmed = await openConfirmDialog({
                        title: "Submit Assessment",
                        message: "Are you sure you want to submit the entire assessment?",
                        confirmText: "Submit",
                      });
                      if (confirmed) {
                        handleSubmit();
                      }
                    }}
                    className="bg-emerald-500 text-black px-10 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-lg"
                  >
                    Submit Assessment
                  </button>
                )
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="bg-amber-400 text-black px-10 py-3 rounded-xl font-bold hover:bg-amber-300 transition-all shadow-lg"
                >
                  Next Question -&gt;
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-xl sticky top-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {filteredQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${
                    currentIndex === idx
                      ? 'bg-amber-400 text-black border-amber-400'
                      : answers[q.id]
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-3 h-3 bg-zinc-800 border border-zinc-600 rounded"></div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-3 h-3 bg-amber-400 rounded"></div>
                <span>Current</span>
              </div>
            </div>

            <button
              onClick={() => handleSubmit()}
              className="w-full mt-8 bg-zinc-800 text-zinc-100 py-3 rounded-xl text-sm font-bold border border-zinc-600 hover:bg-red-700 hover:border-red-500 transition-all"
            >
              Quit Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

