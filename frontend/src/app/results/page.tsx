"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface AssessmentResult {
  attempt_id: string;
  title: string;
  final_score: number;
  total_marks: number;
  result: string;
  end_time: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);

  useEffect(() => {
    apiFetch("/api/results/me").then(setResults);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Results</h1>
          <Link 
            href="/assessment/start" 
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Assessment
          </Link>
        </div>

        {results.length === 0 ? (
        <p className="text-gray-500">No results published yet.</p>
      ) : (
        results.map((r) => (
          <div
            key={r.attempt_id}
            className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl mb-4 shadow-lg flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">{r.title}</h2>
              <p className="text-sm text-gray-400">
                Completed on {new Date(r.end_time).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="flex flex-col items-end">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Score</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {r.final_score} <span className="text-sm text-gray-500 font-normal">/ {r.total_marks}</span>
                </p>
              </div>
              {r.result && (
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  r.result === 'PASS' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {r.result}
                </span>
              )}
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
}
