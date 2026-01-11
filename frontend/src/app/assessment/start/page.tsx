"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { attemptService } from "@/services/attempt.service";
import { enterFullscreen } from "@/hooks/useFullscreen";
import { useAuth } from "@/hooks/useAuth";

export default function StartAssessmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(true);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.role?.toUpperCase() === "ADMIN") {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  if (authLoading || user?.role?.toUpperCase() === "ADMIN") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  async function startAssessment() {
    if (!code.trim()) {
      setError("Please enter an assessment code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      enterFullscreen();
      const res = await attemptService.start(code);
      router.push(`/assessment/attempt/${res.attemptId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid code or unable to start assessment");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          Enter Assessment Code
        </h1>

        <p className="text-gray-400 mb-6">
          Please enter the unique code provided to you to start the assessment.
        </p>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm text-left">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Code (e.g. ABCDEF)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 mb-6 focus:outline-none focus:border-yellow-500 text-center font-mono text-xl tracking-widest"
          maxLength={10}
        />

        <button
          onClick={startAssessment}
          disabled={loading}
          className="w-full bg-yellow-500 text-black px-6 py-3 rounded font-semibold hover:bg-yellow-400 transition"
        >
          {loading ? "Starting..." : "Start Assessment"}
        </button>

        <p className="mt-4 text-xs text-neutral-500">
          Once started, fullscreen mode will be enforced and the timer begins.
        </p>
      </div>
    </div>
  );
}
