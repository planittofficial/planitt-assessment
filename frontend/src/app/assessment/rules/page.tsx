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
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="mb-3 text-3xl font-bold">Assessment Rules</h1>
        <p className="mb-6 text-neutral-400">
          Read these instructions before starting your assessment.
        </p>

        <ol className="mb-8 list-decimal space-y-3 pl-6 text-neutral-200">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/assessment/start"
            className="rounded-lg bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400"
          >
            Proceed to Start
          </Link>
          <Link
            href="/results"
            className="rounded-lg border border-neutral-700 px-5 py-3 font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            View Results
          </Link>
        </div>
      </div>
    </div>
  );
}
