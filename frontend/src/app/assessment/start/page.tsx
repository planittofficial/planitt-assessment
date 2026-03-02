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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4"></div>
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
      const message = String((err as any)?.message || "");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-700 max-w-md w-full text-center shadow-2xl">
        <h1 className="text-2xl font-bold mb-4">
          Enter Assessment Code
        </h1>

        <p className="text-zinc-400 mb-6">
          Please enter the unique code provided to you to start the assessment.
        </p>

        {isMobileDevice && (
          <div className="bg-red-500/15 text-red-300 p-3 rounded mb-4 text-sm text-left border border-red-500/30">
            Assessment is available only in desktop mode. Please use a desktop or laptop browser.
          </div>
        )}

        {error && (
          <div className="bg-red-500/15 text-red-300 p-3 rounded mb-4 text-sm text-left border border-red-500/30">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Code (e.g. ABCDEF)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isMobileDevice === true}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-600 mb-6 focus:outline-none focus:border-amber-400 text-center font-mono text-xl tracking-widest text-zinc-100"
          maxLength={10}
        />

        <button
          onClick={startAssessment}
          disabled={loading || isMobileDevice === true || isMobileDevice === null}
          className="w-full bg-amber-400 text-black px-6 py-3 rounded font-semibold hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Starting..." : "Start Assessment"}
        </button>

        <Link
          href="/results"
          className="block w-full mt-3 bg-zinc-800 text-zinc-100 px-6 py-3 rounded font-semibold border border-zinc-600 hover:bg-zinc-700 transition"
        >
          View Results
        </Link>

        <p className="mt-4 text-xs text-zinc-400">
          Once started, fullscreen mode will be enforced and the timer begins.
        </p>
      </div>
    </div>
  );
}

