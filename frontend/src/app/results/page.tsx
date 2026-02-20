"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface AssessmentResult {
  attempt_id: string;
  title: string;
  final_score: number | null;
  total_marks: number;
  result: string | null;
  is_published: boolean | string | number | null;
  submitted_at: string | null;
}

function isPublishedFlag(value: AssessmentResult["is_published"]) {
  if (value === true) return true;
  if (value === 1) return true;
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "true" || normalized === "t" || normalized === "1";
}

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function loadResults() {
      try {
        const data = await apiFetch("/api/results/me");
        if (mounted) {
          setResults(data);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load results";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadResults();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Results</h1>
          <Link 
            href="/assessment/start" 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Assessment
          </Link>
        </div>

        {loading ? (
        <p className="text-gray-500">Loading results...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : results.length === 0 ? (
        <p className="text-gray-500">No assessments attempted yet.</p>
      ) : (
        results.map((r) => {
          const published = isPublishedFlag(r.is_published);
          return (
          <div
            key={r.attempt_id}
            className="p-6 bg-white border border-gray-200 rounded-xl mb-4 shadow-lg flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{r.title}</h2>
              <p className="text-sm text-gray-600">
                {r.submitted_at
                  ? `Completed on ${new Date(r.submitted_at).toLocaleDateString()}`
                  : "Attempt in progress"}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="flex flex-col items-end">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Score</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {published
                    ? (
                        <>
                          {r.final_score ?? 0} <span className="text-sm text-gray-500 font-normal">/ {r.total_marks}</span>
                        </>
                      )
                    : "Not Released"}
                </p>
              </div>
              {published ? (
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  r.result === 'PASS' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {r.result || "PENDING"}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-300">
                  Not Released
                </span>
              )}
            </div>
          </div>
          );
        })
      )}
      </div>
    </div>
  );
}

