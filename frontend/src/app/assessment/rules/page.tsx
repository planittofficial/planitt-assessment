"use client";

import Link from "next/link";

export default function AssessmentRulesPage() {
  const rules = [
    "Stay in fullscreen mode throughout the assessment.",
    "Do not switch tabs or windows during the attempt.",
    "Each assessment can be attempted only once.",
    "MCQ and descriptive answers are auto-saved as you progress.",
    "Submitting ends the attempt immediately.",
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
        <h1 className="mb-3 text-3xl font-bold">Assessment Rules</h1>
        <p className="mb-6 text-zinc-400">
          Read these instructions before starting your assessment.
        </p>

        <ol className="mb-8 list-decimal space-y-3 pl-6 text-zinc-200">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/assessment/start"
            className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-black hover:bg-amber-300"
          >
            Proceed to Start
          </Link>
          <Link
            href="/results"
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-5 py-3 font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            View Results
          </Link>
        </div>
      </div>
    </div>
  );
}

