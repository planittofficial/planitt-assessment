"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAttemptDetails } from "@/services/admin.service";
import Link from "next/link";

type AttemptResultAnswer = {
  answer_id: string | number;
  question_text: string;
  marks_obtained: number;
  max_marks: number;
  question_type: "MCQ" | "DESCRIPTIVE" | string;
  section?: string;
  user_answer?: string;
  correct_answer?: string;
  is_graded?: boolean;
};

type AttemptResultSummary = {
  started_at?: string;
  start_time?: string;
  submitted_at?: string;
  end_time?: string;
  result?: "PASS" | "FAIL" | string;
  assessment_title: string;
  email: string;
  full_name?: string;
  final_score: number;
  total_marks: number;
};

type AttemptAnalyticsSection = {
  section: string;
  total_questions: number;
  attempted_questions: number;
  mcq_total: number;
  mcq_attempted: number;
  mcq_correct: number;
  mcq_incorrect: number;
  descriptive_total: number;
  descriptive_attempted: number;
  descriptive_pending_grading: number;
  marks_obtained: number;
  max_marks: number;
};

type AttemptAnalytics = {
  total_questions: number;
  attempted_questions: number;
  unattempted_questions: number;
  mcq_total: number;
  mcq_attempted: number;
  mcq_correct: number;
  mcq_incorrect: number;
  descriptive_total: number;
  descriptive_attempted: number;
  descriptive_pending_grading: number;
  marks_obtained: number;
  max_marks: number;
  sections: AttemptAnalyticsSection[];
};

type AttemptResultData = {
  attempt: AttemptResultSummary;
  answers: AttemptResultAnswer[];
  analytics?: AttemptAnalytics;
};

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString() : "N/A";
}

export default function AttemptResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AttemptResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function loadAttemptResult() {
      if (!id) return;

      try {
        const response = await getAttemptDetails(id);
        if (mounted) {
          setData(response);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load attempt result";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadAttemptResult();
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-gray-900">
        <p className="animate-pulse">Loading results...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-20 text-gray-900">
        <p>{error || "Attempt not found."}</p>
      </div>
    );
  }

  const { attempt, answers } = data;
  const startedAt = attempt.started_at ?? attempt.start_time ?? null;
  const submittedAt = attempt.submitted_at ?? attempt.end_time ?? null;
  const startedTime = startedAt ? new Date(startedAt).getTime() : NaN;
  const submittedTime = submittedAt ? new Date(submittedAt).getTime() : NaN;
  const hasValidDuration = Number.isFinite(startedTime) && Number.isFinite(submittedTime) && submittedTime >= startedTime;
  const analytics = data.analytics;

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 transition-colors mb-6 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 sm:p-6">
            <div className={`text-4xl font-black ${
              attempt.result === 'PASS' ? 'text-green-500/20' : 'text-red-500/20'
            }`}>
              {attempt.result}
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{attempt.assessment_title}</h1>
            <p className="text-gray-600 mb-6 font-medium">
              {attempt.full_name ? (
                <>
                  <span className="text-gray-900 font-semibold">{attempt.full_name}</span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span>{attempt.email}</span>
                </>
              ) : (
                attempt.email
              )}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Score</p>
                <p className="text-2xl font-mono font-bold text-gray-900">
                  {attempt.final_score} <span className="text-sm text-gray-500">/ {attempt.total_marks}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Status</p>
                <p className={`text-sm font-bold ${
                  attempt.result === 'PASS' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {attempt.result || 'PENDING'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Started</p>
                <p className="text-sm text-gray-700">
                  {Number.isFinite(startedTime) ? formatTime(startedAt) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Duration</p>
                <p className="text-sm text-gray-700">
                  {hasValidDuration
                    ? `${Math.round((submittedTime - startedTime) / 60000)} mins`
                    : "N/A"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {analytics && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 mb-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Attempt Analytics</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Questions</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{analytics.total_questions}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Solved (Attempted)</p>
                <p className="text-2xl font-mono font-bold text-gray-900">
                  {analytics.attempted_questions} <span className="text-sm text-gray-500">/ {analytics.total_questions}</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Unattempted</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{analytics.unattempted_questions}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">MCQ Correct</p>
                <p className="text-2xl font-mono font-bold text-emerald-600">{analytics.mcq_correct}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">MCQ Incorrect</p>
                <p className="text-2xl font-mono font-bold text-rose-600">{analytics.mcq_incorrect}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Pending Grading</p>
                <p className="text-2xl font-mono font-bold text-amber-700">{analytics.descriptive_pending_grading}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">Section Breakdown</h3>
            <div className="space-y-3">
              {analytics.sections
                .slice()
                .sort((a, b) => (b.max_marks || 0) - (a.max_marks || 0))
                .map((s) => {
                  const pct = s.max_marks > 0 ? Math.round((s.marks_obtained / s.max_marks) * 100) : 0;
                  const mcqPct = s.mcq_attempted > 0 ? Math.round((s.mcq_correct / s.mcq_attempted) * 100) : 0;
                  return (
                    <div key={s.section} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.section}</p>
                          <p className="text-xs text-gray-600">
                            Attempted {s.attempted_questions}/{s.total_questions}
                            {s.mcq_total > 0 && (
                              <>
                                <span className="mx-2 text-gray-300">•</span>
                                MCQ Accuracy {mcqPct}% ({s.mcq_correct}/{s.mcq_attempted})
                              </>
                            )}
                            {s.descriptive_pending_grading > 0 && (
                              <>
                                <span className="mx-2 text-gray-300">•</span>
                                Pending grading {s.descriptive_pending_grading}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-mono font-bold text-gray-900">
                            {s.marks_obtained} <span className="text-xs text-gray-500">/ {s.max_marks}</span>
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{pct}% score</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          Question Breakdown
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-normal">
            {answers.length} Questions
          </span>
        </h2>

        <div className="space-y-4">
          {answers.map((ans, index: number) => (
            <div
              key={ans.answer_id}
              className="bg-white border border-gray-200 rounded-xl p-6 transition-all hover:border-gray-300"
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <span className="text-xs font-mono text-gray-500 block mb-1">Question {index + 1}</span>
                  <p className="text-lg font-medium leading-relaxed">{ans.question_text}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className={`text-lg font-mono font-bold ${
                    ans.marks_obtained > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {ans.marks_obtained} / {ans.max_marks}
                  </p>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                    {ans.question_type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">User Answer</p>
                  <p className={`text-sm ${
                    ans.question_type === 'MCQ' && ans.user_answer === ans.correct_answer 
                      ? 'text-green-400' 
                      : ans.question_type === 'MCQ' 
                        ? 'text-red-400' 
                        : 'text-gray-700'
                  }`}>
                    {ans.user_answer || <span className="italic text-gray-600">No answer provided</span>}
                  </p>
                </div>

                {ans.question_type === 'MCQ' && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Correct Answer</p>
                    <p className="text-sm text-green-400">{ans.correct_answer}</p>
                  </div>
                )}
              </div>
              
              {!ans.is_graded && ans.question_type === 'DESCRIPTIVE' && (
                <div className="mt-4 flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg text-xs w-fit">
                  <span>⚠️ Needs Grading</span>
                  <Link href={`/admin/attempts/${id}`} className="underline font-bold">Grade Now</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
