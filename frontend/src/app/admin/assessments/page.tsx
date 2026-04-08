"use client";

import { useEffect, useState } from "react";
import {
  deleteAssessment,
  getAssessments,
  publishAllResults,
} from "@/services/admin.service";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";
import { Assessment } from "@/types";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminAssessmentsPage() {
  const { user, loading } = useAdmin();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [publishingId, setPublishingId] = useState<string | number | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | number | null>(null);

  const loadAssessments = async () => {
    try {
      const data = await getAssessments();
      setAssessments(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        return;
      }
      throw err;
    }
  };

  useEffect(() => {
    if (loading) return;
    if (user?.role?.toUpperCase() !== "ADMIN") return;

    void loadAssessments().catch((err) => {
      console.error("Failed to load assessments", err);
      notifyError("Failed to load assessments");
    });
  }, [loading, user]);

  const handlePublishAll = async (assessmentId: string | number) => {
    const confirmed = await openConfirmDialog({
      title: "Publish Results",
      message: "Are you sure you want to publish ALL finalized results for this assessment?",
      confirmText: "Publish",
    });
    if (!confirmed) return;

    setPublishingId(assessmentId);
    try {
      const res = await publishAllResults(assessmentId);
      if ((res?.count ?? 0) > 0) {
        notifySuccess(`${res.count} result(s) published successfully.`);
      } else {
        notifyInfo("No finalized unpublished results found to publish.");
      }
    } catch (err) {
      console.error("Failed to publish results", err);
      notifyError("Failed to publish results");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string | number) => {
    const confirmed = await openConfirmDialog({
      title: "Delete Assessment",
      message:
        "This will permanently delete the assessment, all questions, and all attempts. This action cannot be undone.",
      confirmText: "Delete Assessment",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingAssessmentId(assessmentId);
    try {
      await deleteAssessment(assessmentId);
      await loadAssessments();
      notifySuccess("Assessment deleted successfully.");
    } catch (err) {
      console.error("Failed to delete assessment", err);
      notifyError("Failed to delete assessment");
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  return (
    <>
      <div className="hero-card mx-auto max-w-6xl rounded-[2rem] p-4 text-stone-900 shadow-xl sm:p-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">Assessment Library</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950">Assessments</h1>
          </div>
          <Link
            href="/admin/assessments/new"
            className="primary-button w-full px-6 py-3 text-center text-sm sm:w-auto"
          >
            + Create Assessment
          </Link>
        </div>

        {assessments.map((a) => {
          const assessmentId = String(a.id ?? a._id ?? "");
          const hasAssessmentId =
            assessmentId.length > 0 &&
            assessmentId !== "undefined" &&
            assessmentId !== "null";
          return (
          <div
            key={assessmentId || a.title}
            className="mb-4 flex flex-col gap-4 rounded-[1.5rem] border border-stone-200/80 bg-white/80 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="font-semibold text-stone-900">{a.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                  Code: <span className="font-mono font-bold uppercase text-[#c77131]">{a.code}</span>
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                  Duration: <span className="font-bold text-stone-900">{a.duration_minutes} min</span>
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    String(a.status).toLowerCase() === "true" || String(a.status).toUpperCase() === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  }`}
                >
                  {String(a.status).toLowerCase() === "true" || String(a.status).toUpperCase() === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <button
                onClick={() => handlePublishAll(assessmentId)}
                disabled={!hasAssessmentId || publishingId === assessmentId}
                className="secondary-button w-full justify-center rounded-xl border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 disabled:opacity-50 sm:w-auto sm:text-sm"
              >
                {publishingId === assessmentId ? "Publishing..." : "Publish Results"}
              </button>
              {hasAssessmentId ? (
                <Link
                  href={`/admin/assessments/${assessmentId}/edit`}
                  className="secondary-button w-full justify-center rounded-xl px-3 py-2 text-xs sm:w-auto sm:text-sm"
                >
                  Manage Questions
                </Link>
              ) : (
                <span className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-500 sm:w-auto sm:text-sm">Manage Questions</span>
              )}
              {hasAssessmentId ? (
                <Link
                  href={`/admin/assessments/${assessmentId}/attempts`}
                  className="secondary-button w-full justify-center rounded-xl border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:w-auto sm:text-sm"
                >
                  View Attempts -&gt;
                </Link>
              ) : (
                <span className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-500 sm:w-auto sm:text-sm">View Attempts</span>
              )}
              <button
                onClick={() => handleDeleteAssessment(assessmentId)}
                disabled={!hasAssessmentId || deletingAssessmentId === assessmentId}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 sm:w-auto sm:text-sm"
              >
                {deletingAssessmentId === assessmentId ? "Deleting..." : "Delete Assessment"}
              </button>
            </div>
          </div>
        )})}
      </div>
    </>
  );
}
