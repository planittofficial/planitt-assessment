"use client";

import Link from "next/link";

export default function AssessmentRulesPage() {
  const rules = [
    "Stay in fullscreen mode throughout the assessment.",
    "Do not switch tabs or windows during the attempt.",
    "Assessment is allowed only on desktop/laptop browsers. Mobile and tablet devices are not permitted.",
    "Each assessment can be attempted only once.",
    "MCQ and descriptive answers are auto-saved as you progress.",
    "Submitting ends the attempt immediately.",
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-8 text-stone-900">
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="hero-card rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="brand-kicker">Assessment Rules</div>
          <h1 className="mb-3 mt-6 text-4xl font-extrabold tracking-tight text-stone-950">
            Review the rules before you begin
          </h1>
          <p className="mb-8 max-w-2xl text-base leading-7 text-stone-600">
            These guidelines protect the fairness of the assessment and help candidates avoid accidental violations.
          </p>

          <ol className="mb-8 grid gap-4 sm:grid-cols-2">
          {rules.map((rule) => (
            <li
              key={rule}
              className="rounded-[1.5rem] border border-stone-200/80 bg-white/75 p-5 text-sm leading-6 text-stone-700 shadow-sm"
            >
              {rule}
            </li>
          ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/assessment/start"
              className="primary-button px-5 py-3 text-sm"
            >
              Proceed to Start
            </Link>
            <Link
              href="/results"
              className="secondary-button px-5 py-3 text-sm"
            >
              View Results
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

