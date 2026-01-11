"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getDescriptiveAnswers, gradeDescriptiveAnswer, getAttemptSummary } from "@/services/admin.service";

export default function AttemptReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        getDescriptiveAnswers(id),
        getAttemptSummary(id)
      ]).then(([ansData, attemptData]) => {
        setAnswers(ansData);
        setAttempt(attemptData);
        setLoading(false);
      });
    }
  }, [id]);

  async function grade(answerId: number, marks: number) {
    try {
      await gradeDescriptiveAnswer({ answerId, marks });
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, is_graded: true, marks_obtained: marks } : a));
    } catch (err) {
      console.error(err);
      alert("Failed to grade");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
      <p className="animate-pulse">Loading answers...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/admin/assessments`} className="text-gray-400 hover:text-white transition-colors mb-6 block text-sm">
          ← Back to Assessments
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review Descriptive Answers</h1>
          {attempt && (
            <p className="text-gray-400">
              Attempt ID: <span className="text-gray-200 font-mono">{id}</span> • User: <span className="text-gray-200">{attempt.email}</span>
            </p>
          )}
        </div>

        {answers.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">No descriptive answers to grade for this attempt.</p>
            <Link href={`/admin/attempts/${id}/results`} className="text-yellow-500 mt-4 inline-block hover:underline">
              View Detailed Results →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {answers.map((a) => (
              <div
                key={a.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 transition-all hover:border-neutral-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-lg font-medium flex-1 pr-8">{a.question_text}</p>
                  <div className="bg-neutral-800 px-3 py-1 rounded text-xs font-bold text-gray-400">
                    Max Marks: {a.marks}
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 mb-6">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">User Response</p>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{a.answer}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <button
                      onClick={() => grade(a.id, a.marks)}
                      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-600/10"
                    >
                      Full Marks ({a.marks})
                    </button>
                    <button
                      onClick={() => {
                        const m = prompt("Enter marks:", "0");
                        if (m !== null) grade(a.id, Number(m));
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all border border-neutral-700"
                    >
                      Partial Marks
                    </button>
                  </div>

                  {a.is_graded && (
                    <span className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                      ✓ Graded
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
