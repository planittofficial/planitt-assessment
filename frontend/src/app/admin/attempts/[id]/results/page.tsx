"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAttemptDetails } from "@/services/admin.service";
import Link from "next/link";

export default function AttemptResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getAttemptDetails(id)
        .then(setData)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <p className="animate-pulse">Loading results...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <p>Attempt not found.</p>
      </div>
    );
  }

  const { attempt, answers } = data;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors mb-6 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6">
            <div className={`text-4xl font-black ${
              attempt.result === 'PASS' ? 'text-green-500/20' : 'text-red-500/20'
            }`}>
              {attempt.result}
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{attempt.assessment_title}</h1>
            <p className="text-gray-400 mb-6 font-medium">{attempt.email}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Score</p>
                <p className="text-2xl font-mono font-bold text-white">
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
                <p className="text-sm text-gray-300">
                  {new Date(attempt.start_time).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Duration</p>
                <p className="text-sm text-gray-300">
                  {attempt.end_time 
                    ? `${Math.round((new Date(attempt.end_time).getTime() - new Date(attempt.start_time).getTime()) / 60000)} mins`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          Question Breakdown
          <span className="text-xs bg-neutral-800 text-gray-400 px-2 py-1 rounded-full font-normal">
            {answers.length} Questions
          </span>
        </h2>

        <div className="space-y-4">
          {answers.map((ans: any, index: number) => (
            <div
              key={ans.answer_id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 transition-all hover:border-neutral-700"
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
                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">User Answer</p>
                  <p className={`text-sm ${
                    ans.question_type === 'MCQ' && ans.user_answer === ans.correct_answer 
                      ? 'text-green-400' 
                      : ans.question_type === 'MCQ' 
                        ? 'text-red-400' 
                        : 'text-gray-300'
                  }`}>
                    {ans.user_answer || <span className="italic text-gray-600">No answer provided</span>}
                  </p>
                </div>

                {ans.question_type === 'MCQ' && (
                  <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
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
    </div>
  );
}
