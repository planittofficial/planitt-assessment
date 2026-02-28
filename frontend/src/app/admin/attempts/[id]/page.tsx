"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDescriptiveAnswers, gradeDescriptiveAnswer, getAttemptSummary } from "@/services/admin.service";
import { notifyError } from "@/lib/notify";
import { openPromptDialog } from "@/lib/dialog";

export default function AttemptReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      notifyError("Failed to grade");
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-gray-900">
      <p className="animate-pulse">Loading answers...</p>
    </div>
  );

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 transition-colors mb-4 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review Descriptive Answers</h1>
          {attempt && (
            <p className="text-gray-600">
              Attempt ID: <span className="text-gray-900 font-mono">{id}</span> • User: <span className="text-gray-900">{attempt.email}</span>
            </p>
          )}
        </div>

        {answers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600">No descriptive answers to grade for this attempt.</p>
            <Link href={`/admin/attempts/${id}/results`} className="text-yellow-500 mt-4 inline-block hover:underline">
              View Detailed Results →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {answers.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl p-6 transition-all hover:border-gray-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-lg font-medium flex-1 pr-8">{a.question_text}</p>
                  <div className="bg-gray-100 px-3 py-1 rounded text-xs font-bold text-gray-600">
                    Max Marks: {a.marks}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">User Response</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {a.answer_text ?? a.answer ?? a.user_answer ?? ""}
                  </p>
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
                      onClick={async () => {
                        const entered = await openPromptDialog({
                          title: "Grade Answer",
                          message: `Enter marks (0 to ${a.marks})`,
                          defaultValue: "0",
                          confirmText: "Save Marks",
                          inputPlaceholder: "Marks",
                        });
                        if (entered === null) return;
                        grade(a.id, Number(entered));
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border border-gray-300"
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
    </>
  );
}
