"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAttemptsByAssessment, publishAllResults } from "@/services/admin.service";
import { useAdmin } from "@/hooks/useAdmin";

import Link from "next/link";

export default function AdminAssessmentAttemptsPage() {
  const { loading: adminLoading } = useAdmin();
  const params = useParams();

  const rawAssessmentId = params.assessmentsId;
  const assessmentId = Array.isArray(rawAssessmentId)
    ? rawAssessmentId[0]
    : rawAssessmentId;

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingAll, setPublishingAll] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");

  const loadAttempts = async () => {
    if (!assessmentId) return;
    try {
      const data = await getAttemptsByAssessment(assessmentId);
      setAttempts(data);
    } catch (err) {
      console.error("Failed to load attempts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, [assessmentId]);

  const handlePublishAll = async () => {
    if (!assessmentId) return;
    if (
      !confirm(
        "Are you sure you want to publish ALL finalized results for this assessment? This will make them visible to all candidates."
      )
    )
      return;

    setPublishingAll(true);
    try {
      await publishAllResults(assessmentId);
      await loadAttempts();
      alert("All finalized results published successfully.");
    } catch (err) {
      console.error("Failed to publish results", err);
      alert("Failed to publish results");
    } finally {
      setPublishingAll(false);
    }
  };

  const filteredAttempts = attempts.filter((a) => {
    if (filter === "ALL") return true;
    return a.result === filter;
  });

  const handleExportPassed = () => {
    const passed = attempts.filter(a => a.result === "PASS");
    if (passed.length === 0) {
      alert("No passed candidates to export.");
      return;
    }

    const headers = ["Attempt ID", "Email", "Status", "Score", "Result", "Start Time", "End Time"];
    const csvContent = [
      headers.join(","),
      ...passed.map(a => [
        a.id,
        a.email,
        a.status,
        a.final_score ?? "0",
        a.result,
        new Date(a.start_time).toLocaleString(),
        a.end_time ? new Date(a.end_time).toLocaleString() : "N/A"
      ].map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `passed_candidates_assessment_${assessmentId}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4 text-gray-400">No attempts found for this assessment.</p>
        <Link href="/admin/assessments" className="text-yellow-500 hover:underline">
          ← Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/admin" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin/assessments" className="text-gray-400 hover:text-white transition-colors text-sm mb-2 block">
              ← Back to Assessments
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Assessment Attempts</h1>
            <p className="text-gray-400 mt-1 text-sm">Review student performance and grade descriptive answers.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportPassed}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-lg font-bold transition-all border border-neutral-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Passed
            </button>
            <button
              onClick={handlePublishAll}
              disabled={publishingAll || attempts.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50"
            >
              {publishingAll ? "Publishing..." : "Publish All Results"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-neutral-900 p-1 rounded-xl border border-neutral-800 w-fit">
          {(["ALL", "PASS", "FAIL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === f
                  ? "bg-neutral-800 text-yellow-500 shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f} ({attempts.filter(a => f === "ALL" ? true : a.result === f).length})
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredAttempts.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
              <p className="text-gray-500">No attempts match the current filter.</p>
            </div>
          ) : (
            filteredAttempts.map((a) => (
            <div
              key={a.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between transition-all hover:border-neutral-700 shadow-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono text-gray-500 bg-neutral-800 px-2 py-0.5 rounded">ID: {a.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {a.status}
                  </span>
                  {a.is_published && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/10 text-blue-400">
                      Published
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-medium text-white mb-1">{a.email}</h3>
                <div className="flex gap-4 text-xs text-gray-400">
                  <p>Started: {new Date(a.start_time).toLocaleString()}</p>
                  {a.end_time && <p>Ended: {new Date(a.end_time).toLocaleString()}</p>}
                </div>
              </div>

              <div className="mt-4 md:mt-0 md:ml-8 flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Score</p>
                  <p className={`text-xl font-bold ${
                    a.result === 'PASS' ? 'text-green-400' : a.result === 'FAIL' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {a.final_score ?? '-'}
                    {a.result && <span className="ml-1 text-xs opacity-60">({a.result})</span>}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/admin/attempts/${a.id}`}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-neutral-700"
                  >
                    Grade Details
                  </Link>
                  <Link
                    href={`/admin/attempts/${a.id}/results`}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-yellow-500/10"
                  >
                    View Results
                  </Link>
                  {a.is_published && (
                    <span className="bg-green-500/10 text-green-400 px-4 py-2 rounded-lg text-sm font-bold border border-green-500/20">
                      Published
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
}
