"use client";

export const dynamic = "force-dynamic";

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
    <main className="app-shell min-h-screen px-4 py-8 text-stone-900">
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="brand-kicker">Candidate Results</div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-stone-950">
              My Results
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Published scores and outcome status appear here after administrator release.
            </p>
          </div>
          <Link 
            href="/assessment/start" 
            className="secondary-button flex items-center gap-2 px-4 py-3 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Assessment
          </Link>
        </div>

        {loading ? (
          <div className="hero-card rounded-[2rem] p-8 text-stone-600">Loading results...</div>
        ) : error ? (
          <div className="status-note error">{error}</div>
        ) : results.length === 0 ? (
          <div className="hero-card rounded-[2rem] p-8 text-stone-600">
            No assessments attempted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r) => {
              const published = isPublishedFlag(r.is_published);
              return (
                <div
                  key={r.attempt_id}
                  className="hero-card flex flex-col gap-4 rounded-[1.75rem] p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h2 className="text-xl font-bold text-stone-950">{r.title}</h2>
                    <p className="mt-2 text-sm text-stone-600">
                      {r.submitted_at
                        ? `Completed on ${new Date(r.submitted_at).toLocaleDateString()}`
                        : "Attempt in progress"}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <div className="flex flex-col sm:items-end">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">
                        Score
                      </p>
                      <p className="text-3xl font-extrabold text-[#c77131]">
                        {published ? (
                          <>
                            {r.final_score ?? 0}
                            <span className="ml-2 text-sm font-medium text-stone-500">
                              / {r.total_marks}
                            </span>
                          </>
                        ) : (
                          "Not Released"
                        )}
                      </p>
                    </div>
                    {published ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${
                          r.result === "PASS"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {r.result || "PENDING"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-600">
                        Not Released
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

