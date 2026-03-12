"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAllAttemptsByAssessment,
  deleteAttempt,
  getAttemptsByAssessment,
  getViolationsByAttempt,
  publishAllResults,
} from "@/services/admin.service";
import { useAdmin } from "@/hooks/useAdmin";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";
import { ApiError } from "@/lib/api";

import Link from "next/link";

type ViolationRecord = {
  violation_type?: string;
};

type AttemptItem = {
  id: string | number;
  email?: string;
  status?: string;
  started_at?: string;
  submitted_at?: string;
  start_time?: string;
  end_time?: string;
  final_score?: number | string;
  result?: "PASS" | "FAIL" | string;
  is_published?: boolean;
  screen_recording_violations?: number;
};

const SCREEN_RECORDING_VIOLATION_TYPES = new Set([
  "FULLSCREEN_EXIT",
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "PAGE_HIDE",
  "SCREEN_RECORDING_STOPPED",
  "SCREEN_RECORDING_DISABLED",
  "SCREEN_RECORDING_PERMISSION_DENIED",
]);

function isScreenRecordingViolation(type: unknown) {
  const normalized = String(type || "").trim().toUpperCase();
  return (
    SCREEN_RECORDING_VIOLATION_TYPES.has(normalized) ||
    normalized.includes("SCREEN") ||
    normalized.includes("RECORD")
  );
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

export default function AdminAssessmentAttemptsPage() {
  const { user, loading: adminLoading } = useAdmin();
  const params = useParams();

  const rawAssessmentId = (params as Record<string, string | string[] | undefined>).assessmentsId
    ?? (params as Record<string, string | string[] | undefined>).assessmentId;
  const assessmentId = Array.isArray(rawAssessmentId)
    ? rawAssessmentId[0]
    : rawAssessmentId;

  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingAll, setPublishingAll] = useState(false);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | number | null>(null);
  const [deletingAllAttempts, setDeletingAllAttempts] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");

  const loadAttempts = useCallback(async () => {
    const isAdmin = user?.role?.toUpperCase() === "ADMIN";
    if (!assessmentId || adminLoading || !isAdmin) return;
    try {
      const data = await getAttemptsByAssessment(assessmentId);
      const attemptsWithViolations = await Promise.all(
        (data ?? []).map(async (attempt: AttemptItem) => {
          try {
            const violations = await getViolationsByAttempt(attempt.id);
            const screenRecordingViolations = Array.isArray(violations)
              ? violations.filter((v: ViolationRecord) => isScreenRecordingViolation(v?.violation_type))
              : [];
            return {
              ...attempt,
              screen_recording_violations: screenRecordingViolations.length,
            };
          } catch {
            return {
              ...attempt,
              screen_recording_violations: 0,
            };
          }
        })
      );
      setAttempts(attemptsWithViolations);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return;
      }
      console.error("Failed to load attempts", err);
      notifyError("Failed to load attempts.");
    } finally {
      setLoading(false);
    }
  }, [adminLoading, assessmentId, user?.role]);

  useEffect(() => {
    const isAdmin = user?.role?.toUpperCase() === "ADMIN";
    if (adminLoading || !isAdmin) return;
    void loadAttempts();
  }, [adminLoading, loadAttempts, user?.role]);

  const handlePublishAll = async () => {
    if (!assessmentId) return;
    const confirmed = await openConfirmDialog({
      title: "Publish All Results",
      message:
        "Are you sure you want to publish ALL finalized results for this assessment? This will make them visible to all candidates.",
      confirmText: "Publish",
    });
    if (!confirmed) return;

    setPublishingAll(true);
    try {
      const res = await publishAllResults(assessmentId);
      await loadAttempts();
      if ((res?.count ?? 0) > 0) {
        notifySuccess(`${res.count} finalized result(s) published successfully.`);
      } else {
        notifyInfo("No finalized unpublished results found to publish.");
      }
    } catch (err) {
      console.error("Failed to publish results", err);
      notifyError("Failed to publish results");
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
      notifyInfo("No passed candidates to export.");
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
        formatDateTime(a.started_at ?? a.start_time),
        formatDateTime(a.submitted_at ?? a.end_time)
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

  const handleDeleteAttempt = async (attemptId: string | number) => {
    const confirmed = await openConfirmDialog({
      title: "Delete Attempt",
      message: "Are you sure you want to delete this attempt? This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingAttemptId(attemptId);
    try {
      await deleteAttempt(attemptId, assessmentId);
      await loadAttempts();
      notifySuccess("Attempt deleted successfully");
    } catch (err) {
      console.error("Failed to delete attempt", err);
      notifyError("Failed to delete attempt");
    } finally {
      setDeletingAttemptId(null);
    }
  };

  const handleDeleteAllAttempts = async () => {
    if (!assessmentId) return;
    const confirmed = await openConfirmDialog({
      title: "Delete All Attempts",
      message: "This will permanently delete all attempts for this assessment. Continue?",
      confirmText: "Delete All",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingAllAttempts(true);
    try {
      const attemptIds = attempts.map((a) => a.id).filter(Boolean);
      const res = await deleteAllAttemptsByAssessment(assessmentId, attemptIds);
      await loadAttempts();
      notifySuccess(`${res?.count ?? 0} attempt(s) deleted successfully.`);
    } catch (err) {
      console.error("Failed to delete all attempts", err);
      notifyError("Failed to delete all attempts");
    } finally {
      setDeletingAllAttempts(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <p className="text-gray-500 text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-900">
        <p className="text-xl mb-4 text-gray-500">No attempts found for this assessment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Assessment Attempts</h1>
            <p className="text-gray-500 mt-1 text-sm">Review student performance and grade descriptive answers.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportPassed}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-bold transition-all border border-gray-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Passed
            </button>
            <button
              onClick={handlePublishAll}
              disabled={publishingAll || attempts.length === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-yellow-500/10 disabled:opacity-50"
            >
              {publishingAll ? "Publishing..." : "Publish All Results"}
            </button>
            <button
              onClick={handleDeleteAllAttempts}
              disabled={deletingAllAttempts || attempts.length === 0}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-2 rounded-lg font-bold transition-all border border-red-200 disabled:opacity-50"
            >
              {deletingAllAttempts ? "Deleting..." : "Delete All Attempts"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl border border-gray-200 w-fit">
          {(["ALL", "PASS", "FAIL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === f
                  ? "bg-yellow-500 text-black shadow"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              {f} ({attempts.filter(a => f === "ALL" ? true : a.result === f).length})
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredAttempts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-500">No attempts match the current filter.</p>
            </div>
          ) : (
            filteredAttempts.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between transition-all hover:border-gray-300"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">ID: {a.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {a.status}
                  </span>
                  {a.is_published && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-100 text-sky-700">
                      Published
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      Number(a.screen_recording_violations) > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                    title="Screen recording related violations"
                  >
                    Screen Violations: {Number(a.screen_recording_violations) || 0}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">{a.email}</h3>
                <div className="flex gap-4 text-xs text-gray-500">
                  <p>Started: {formatDateTime(a.started_at ?? a.start_time)}</p>
                  <p>Ended: {formatDateTime(a.submitted_at ?? a.end_time)}</p>
                </div>
              </div>

              <div className="mt-4 md:mt-0 md:ml-8 flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Score</p>
                  <p className={`text-xl font-bold ${
                    a.result === 'PASS' ? 'text-emerald-600' : a.result === 'FAIL' ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {a.final_score ?? '-'}
                    {a.result && <span className="ml-1 text-xs opacity-60">({a.result})</span>}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/admin/attempts/${a.id}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-300"
                  >
                    Grade Details
                  </Link>
                  <Link
                    href={`/admin/attempts/${a.id}/results`}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-yellow-500/10"
                  >
                    View Results
                  </Link>
                  <button
                    onClick={() => handleDeleteAttempt(a.id)}
                    disabled={deletingAttemptId === a.id}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 transition-all disabled:opacity-50"
                    title="Delete Attempt"
                  >
                    {deletingAttemptId === a.id ? "Deleting..." : "Delete"}
                  </button>
                  {a.is_published && (
                    <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-200">
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
    </>
  );
}
