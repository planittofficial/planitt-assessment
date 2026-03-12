"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { attemptService } from "@/services/attempt.service";
import { enterFullscreen } from "@/hooks/useFullscreen";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { isMobileOrTabletDevice } from "@/lib/device";

export default function StartAssessmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(true);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role?.toUpperCase() === "ADMIN") {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsMobileDevice(isMobileOrTabletDevice());
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  if (authLoading || user?.role?.toUpperCase() === "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#c77131]"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  async function startAssessment() {
    if (isMobileDevice) {
      setError("Assessment can only be started on a desktop or laptop browser.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter an assessment code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await attemptService.start(code);
      // Only force fullscreen after the attempt is successfully created.
      enterFullscreen();
      router.push(`/assessment/attempt/${res.attemptId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const attemptId =
        err instanceof ApiError ? String(err.data?.attemptId || "") : "";

      if (message.toLowerCase().includes("active attempt already exists") && attemptId) {
        router.push(`/assessment/attempt/${attemptId}`);
        return;
      }

      if (message.toLowerCase().includes("no questions configured")) {
        setError("This assessment is not ready yet. Please contact your administrator.");
      } else {
        setError(message || "Invalid code or unable to start assessment");
      }
      setLoading(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10 text-stone-900">
      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="hero-card rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
          <div className="brand-kicker">Candidate Journey</div>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">
            Enter your code and move into a calmer assessment flow.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            The system checks device compatibility, starts your timer only after a valid entry,
            and keeps the process focused on desktop-first completion.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Secure entry", "Fullscreen begins only after the attempt starts."],
              ["Desktop only", "Mobile and tablet devices are blocked."],
              ["Results access", "Candidates can review published outcomes anytime."],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-[1.5rem] border border-stone-200/80 bg-white/75 p-4 shadow-sm"
              >
                <p className="text-sm font-extrabold text-stone-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hero-card my-auto rounded-[2rem] p-6 text-center sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">
              Assessment Access
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950">
              Enter Assessment Code
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Use the unique code shared by your recruiter or administrator.
            </p>
          </div>

          {isMobileDevice && (
            <div className="status-note error mb-4 text-left">
              Assessment is available only in desktop mode. Please use a desktop or laptop browser.
            </div>
          )}

          {error && (
            <div className="status-note error mb-4 text-left">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="ABCDEF"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isMobileDevice === true}
            className="field-input mb-5 px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.35em] uppercase"
            maxLength={10}
          />

          <button
            onClick={startAssessment}
            disabled={loading || isMobileDevice === true || isMobileDevice === null}
            className="primary-button w-full px-6 py-3.5 text-base disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Start Assessment"}
          </button>

          <Link
            href="/results"
            className="secondary-button mt-3 flex w-full px-6 py-3.5 text-base"
          >
            View Results
          </Link>

          <p className="mt-5 text-xs leading-5 text-stone-500">
            Once started, fullscreen mode will be enforced and the timer begins immediately.
          </p>
        </section>
      </div>
    </main>
  );
}

