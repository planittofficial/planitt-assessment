"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { attemptService } from "@/services/attempt.service";
import { useViolation } from "@/hooks/useViolation";
import { Question } from "@/types";
import { notifyError, notifyInfo } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";
import { isMobileOrTabletDevice } from "@/lib/device";

const SECTIONS = ["Quantitative", "Verbal", "Coding", "Logical"] as const;

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
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof window === "undefined" ? true : window.navigator.onLine
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);
  const [isRetryingFailedAnswers, setIsRetryingFailedAnswers] = useState(false);
  const [failedAnswers, setFailedAnswers] = useState<Record<string, string>>({});
  const [isMobileDevice, setIsMobileDevice] = useState<boolean | null>(null);

  const {
    violationCount,
    requireFullscreen,
    requestAssessmentFullscreen,
  } = useViolation(id, isMobileDevice === false);

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
    if (isMobileDevice !== false) return;
    attemptService.getQuestions(id).then((data) => {
      setQuestions(data);
    });
  }, [id, isMobileDevice]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsMobileDevice(isMobileOrTabletDevice());
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const activeSection =
    questions.length > 0 && !questions.some((q) => q.section === selectedSection)
      ? (SECTIONS.find((section) => questions.some((q) => q.section === section)) ?? selectedSection)
      : selectedSection;
  const filteredQuestions = questions.filter((q) => q.section === activeSection);
  const visibleCurrentIndex =
    filteredQuestions.length > 0 && currentIndex >= filteredQuestions.length ? 0 : currentIndex;
  const sectionStats = SECTIONS.map((section) => {
    const sectionQuestions = questions.filter((q) => q.section === section);
    const answered = sectionQuestions.filter((q) => {
      const value = answers[q.id];
      return typeof value === "string" && value.trim().length > 0;
    }).length;
    return {
      section,
      total: sectionQuestions.length,
      answered,
      unanswered: sectionQuestions.length - answered,
      questions: sectionQuestions,
    };
  });
  const totalQuestions = questions.length;
  const totalAnswered = sectionStats.reduce((sum, item) => sum + item.answered, 0);
  const totalUnanswered = totalQuestions - totalAnswered;
  const failedAnswerCount = Object.keys(failedAnswers).length;
  const sectionIndex = SECTIONS.indexOf(activeSection as (typeof SECTIONS)[number]);
  const nextSection =
    sectionIndex >= 0 && sectionIndex < SECTIONS.length - 1
      ? SECTIONS[sectionIndex + 1]
      : null;
  const isLastQuestionInSection =
    filteredQuestions.length > 0 && visibleCurrentIndex === filteredQuestions.length - 1;
  const isSectionBoundary = filteredQuestions.length === 0 || isLastQuestionInSection;

  const retryFailedAnswers = useCallback(async () => {
    if (submittedScore !== null) return;
    const pendingEntries = Object.entries(failedAnswers);
    if (pendingEntries.length === 0) return;

    setIsRetryingFailedAnswers(true);
    const stillFailed: Record<string, string> = {};

    for (const [questionId, value] of pendingEntries) {
      try {
        await attemptService.saveAnswer(id, {
          questionId,
          answer: value,
        });
      } catch {
        stillFailed[questionId] = value;
      }
    }

    setFailedAnswers(stillFailed);
    setIsRetryingFailedAnswers(false);

    if (Object.keys(stillFailed).length === 0) {
      setShowReconnectedBanner(true);
    }
  }, [id, failedAnswers, submittedScore]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      void retryFailedAnswers();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [retryFailedAnswers]);

  useEffect(() => {
    if (!showReconnectedBanner) return;
    const timeout = setTimeout(() => {
      setShowReconnectedBanner(false);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [showReconnectedBanner]);

  const jumpToQuestion = useCallback((questionId: string) => {
    const targetQuestion = questions.find((q) => q.id === questionId);
    if (!targetQuestion) return;

    setSelectedSection(targetQuestion.section);
    const targetIndex = questions
      .filter((q) => q.section === targetQuestion.section)
      .findIndex((q) => q.id === questionId);
    setCurrentIndex(targetIndex >= 0 ? targetIndex : 0);
    setIsReviewOpen(false);
  }, [questions]);

  async function saveAnswer(qId: string, value: string) {
    if (submittedScore !== null) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      setFailedAnswers((prev) => ({ ...prev, [qId]: value }));
      return;
    }
    try {
      await attemptService.saveAnswer(id, {
        questionId: qId,
        answer: value,
      });
      setFailedAnswers((prev) => {
        if (!(qId in prev)) return prev;
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    } catch (err) {
      console.error("Failed to save answer", err);
      setFailedAnswers((prev) => ({ ...prev, [qId]: value }));
    }
  }

  const handleNextQuestion = () => {
    if (visibleCurrentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(visibleCurrentIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (visibleCurrentIndex > 0) {
      setCurrentIndex(visibleCurrentIndex - 1);
    }
  };

  const handleNextSection = () => {
    if (!nextSection) return;
    setSelectedSection(nextSection);
    setCurrentIndex(0);
  };

  if (isMobileDevice === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-900">
        <p className="animate-pulse">Checking device compatibility...</p>
      </div>
    );
  }

  if (isMobileDevice) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-6 text-stone-900">
        <div className="hero-card max-w-xl w-full rounded-[2rem] p-8 text-center">
          <h1 className="text-3xl font-bold mb-3">Desktop Mode Required</h1>
          <p className="mb-6 text-stone-600">
            This assessment cannot be taken on mobile or tablet devices.
            Please open it on a desktop or laptop browser.
          </p>
          <button
            onClick={() => router.push("/assessment/start")}
            className="primary-button px-6 py-3"
          >
            Back to Start
          </button>
        </div>
      </div>
    );
  }

  if (submittedScore !== null) {
    // ... success UI
    // ... (Keep existing success UI)
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-6 text-stone-900">
        <div className="hero-card max-w-md w-full rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Assessment Submitted!</h1>
          <p className="mb-8 text-stone-600">Your responses have been recorded successfully.</p>
          
          <div className="mb-8 rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-6">
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-stone-500">Your Score</p>
            <p className="text-5xl font-black text-[#c77131]">{submittedScore}</p>
          </div>

          <p className="mb-8 text-sm italic text-stone-500">
            Note: Your final result (Pass/Fail) will be available once published by the administrator.
          </p>

          <button
            onClick={() => router.push("/results")}
            className="primary-button w-full py-4"
          >
            Go to My Results
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-900">
        <p className="animate-pulse">Loading questions...</p>
      </div>
    );
  }

  const currentQuestion = filteredQuestions[visibleCurrentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-stone-900 sm:px-6">
      {(!isOnline || isRetryingFailedAnswers || showReconnectedBanner) && (
        <div className={`sticky top-2 z-50 mb-4 rounded-2xl border px-4 py-3 text-sm backdrop-blur ${
          !isOnline
            ? "bg-red-50/90 border-red-200 text-red-700"
            : isRetryingFailedAnswers
              ? "bg-amber-50/90 border-amber-200 text-amber-800"
              : "bg-emerald-50/90 border-emerald-200 text-emerald-700"
        }`}>
          {!isOnline && "Connection unstable: answers are stored locally and will sync once you are back online."}
          {isRetryingFailedAnswers && "Connection restored. Syncing pending answers..."}
          {!isRetryingFailedAnswers && isOnline && showReconnectedBanner && "Connection restored. Pending answers synced successfully."}
        </div>
      )}

      {requireFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="hero-card w-full max-w-md rounded-[2rem] p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Fullscreen Required</h2>
            <p className="mb-6 text-sm text-stone-600">
              You exited fullscreen mode. To continue the assessment, re-enter fullscreen.
            </p>
            <button
              onClick={requestAssessmentFullscreen}
              className="primary-button w-full py-3"
            >
              Go Fullscreen
            </button>
            <p className="mt-3 text-xs text-stone-500">
              This popup will close only after fullscreen is enabled.
            </p>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Section Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
            {sectionStats.map((sectionInfo) => (
              <button
                key={sectionInfo.section}
                onClick={() => {
                  setSelectedSection(sectionInfo.section);
                  setCurrentIndex(0);
                }}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border text-left ${
                  activeSection === sectionInfo.section
                    ? "bg-[#f9e7d2] text-[#8b5224] border-amber-200 shadow-sm"
                    : "bg-white/75 text-stone-700 border-stone-200 hover:border-stone-300"
                }`}
              >
                <p>{sectionInfo.section}</p>
                <p className={`text-[11px] ${activeSection === sectionInfo.section ? "text-[#8b5224]/75" : "text-stone-500"}`}>
                  {sectionInfo.answered}/{sectionInfo.total} answered
                </p>
              </button>
            ))}
          </div>

          <div className="hero-card mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[1.5rem] px-4 py-3 text-sm">
            <p className="text-stone-700">
              Progress: <span className="font-bold text-[#c77131]">{totalAnswered}</span> / {totalQuestions} answered
            </p>
            <p className="text-stone-700">
              Unanswered: <span className="font-bold text-rose-600">{totalUnanswered}</span>
            </p>
            {failedAnswerCount > 0 && (
              <p className="text-stone-700">
                Pending Sync: <span className="font-bold text-amber-700">{failedAnswerCount}</span>
              </p>
            )}
          </div>

          <div className="hero-card mb-8 flex items-center justify-between rounded-[1.5rem] p-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {currentQuestion?.section}
                </span>
                <h1 className="text-xl font-bold">Question {visibleCurrentIndex + 1} of {filteredQuestions.length}</h1>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  violationCount >= 2
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-stone-100 text-stone-600 border-stone-200"
                }`}>
                  Violations: {violationCount}/3
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-200">
                <div 
                  className="h-full bg-[#c77131] transition-all duration-1000" 
                  style={{ width: `${(timeLeft / (60 * 60)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Overall Time Remaining</p>
              <p className={`text-2xl font-black ${timeLeft <= 300 ? 'text-rose-600 animate-pulse' : 'text-[#c77131]'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          <div className="hero-card mb-8 min-h-[400px] rounded-[1.75rem] p-8 shadow-xl">
            {currentQuestion ? (
              <>
                <p className="mb-8 text-xl font-medium leading-relaxed text-stone-900">
                  {currentQuestion.question_text}
                </p>

                {currentQuestion.question_type.toUpperCase() === "MCQ" ? (
                  <div className="grid gap-4">
                    {currentQuestion.options?.map((opt) => (
                      <label 
                        key={opt.id} 
                        className={`flex cursor-pointer items-center rounded-2xl border p-4 transition-all ${
                          answers[currentQuestion.id] === opt.id 
                          ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm' 
                          : 'bg-white/80 border-stone-200 hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === opt.id}
                          onChange={() => saveAnswer(currentQuestion.id, opt.id)}
                          className="hidden"
                        />
                        <div className={`mr-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          answers[currentQuestion.id] === opt.id ? 'border-amber-500' : 'border-stone-400'
                        }`}>
                          {answers[currentQuestion.id] === opt.id && <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>}
                        </div>
                        {opt.text}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="field-input min-h-[180px] p-4"
                    rows={6}
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => {
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }));
                    }}
                    onBlur={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center italic text-stone-500">
                No questions in this section.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevQuestion}
              disabled={visibleCurrentIndex === 0}
              className="secondary-button px-8 py-3 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Previous
            </button>
            <div className="flex gap-4">
              {isSectionBoundary ? (
                nextSection ? (
                  <button
                    onClick={handleNextSection}
                    className="primary-button px-10 py-3"
                  >
                    Next Section -&gt;
                  </button>
                ) : (
                  <button
                    onClick={() => setIsReviewOpen(true)}
                    className="rounded-2xl bg-emerald-600 px-10 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    Review & Submit
                  </button>
                )
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="primary-button px-10 py-3"
                >
                  Next Question -&gt;
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="hero-card sticky top-6 rounded-[1.75rem] p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stone-500">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {filteredQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square w-full rounded-xl border text-sm font-bold transition-all ${
                      visibleCurrentIndex === idx
                      ? 'bg-[#e39a52] text-white border-[#e39a52]'
                      : answers[q.id]
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-white/80 text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <div className="h-3 w-3 rounded border border-emerald-200 bg-emerald-100"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <div className="h-3 w-3 rounded border border-stone-200 bg-white"></div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <div className="h-3 w-3 rounded bg-[#e39a52]"></div>
                <span>Current</span>
              </div>
            </div>

            <button
              onClick={() => setIsReviewOpen(true)}
              className="secondary-button mt-8 w-full py-3 text-sm hover:bg-rose-50 hover:text-rose-700"
            >
              Review Before Submit
            </button>
          </div>
        </div>
      </div>

      {isReviewOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
          <div className="hero-card mx-auto max-w-4xl rounded-[2rem] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-6">
              <div>
                <h2 className="text-2xl font-bold">Review Before Submit</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Unanswered: <span className="font-semibold text-rose-600">{totalUnanswered}</span> of {totalQuestions}
                </p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="secondary-button px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {sectionStats
                .filter((item) => item.total > 0)
                .map((item) => (
                  <div key={item.section} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-stone-900">{item.section}</h3>
                      <p className="text-xs text-stone-500">
                        {item.answered}/{item.total} answered, {item.unanswered} unanswered
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.questions.map((q, idx) => {
                        const questionOrder = questions.findIndex((candidate) => candidate.id === q.id) + 1;
                        const answered = typeof answers[q.id] === "string" && answers[q.id].trim().length > 0;
                        return (
                          <button
                            key={q.id}
                            onClick={() => jumpToQuestion(q.id)}
                            className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                              answered
                                ? "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200"
                                : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                            }`}
                            title={q.question_text}
                          >
                            Q{questionOrder} ({idx + 1})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 p-6">
              <button
                onClick={() => setIsReviewOpen(false)}
                className="secondary-button px-5 py-3"
              >
                Continue Attempt
              </button>
              <button
                onClick={async () => {
                  const confirmed = await openConfirmDialog({
                    title: "Submit Assessment",
                    message: totalUnanswered > 0
                      ? `You still have ${totalUnanswered} unanswered question(s). Submit anyway?`
                      : "Are you sure you want to submit the entire assessment?",
                    confirmText: "Submit",
                  });
                  if (confirmed) {
                    setIsReviewOpen(false);
                    handleSubmit();
                  }
                }}
                className="rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-500"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

