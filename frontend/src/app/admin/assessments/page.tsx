"use client";

import { useEffect, useState } from "react";
import {
  deleteAssessment,
  getAssessments,
  publishAllResults,
} from "@/services/admin.service";
import Link from "next/link";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { openConfirmDialog } from "@/lib/dialog";

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<string | number | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | number | null>(null);

  const loadAssessments = async () => {
    const data = await getAssessments();
    setAssessments(data);
  };

  useEffect(() => {
    loadAssessments();
  }, []);

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
      <div className="max-w-6xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
          <Link
            href="/admin/assessments/new"
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-yellow-500/10"
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
            className="p-4 border border-gray-200 rounded mb-4 flex justify-between bg-white"
          >
            <div>
              <p className="font-semibold text-gray-900">{a.title}</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">
                  Code: <span className="text-yellow-600 font-mono font-bold uppercase">{a.code}</span>
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${
                    String(a.status).toLowerCase() === "true" || String(a.status).toUpperCase() === "ACTIVE"
                      ? "text-emerald-700 border-emerald-200 bg-emerald-100"
                      : "text-red-700 border-red-200 bg-red-100"
                  }`}
                >
                  {String(a.status).toLowerCase() === "true" || String(a.status).toUpperCase() === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button
                onClick={() => handlePublishAll(assessmentId)}
                disabled={!hasAssessmentId || publishingId === assessmentId}
                className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-yellow-700 transition-all hover:bg-yellow-100 disabled:opacity-50"
              >
                {publishingId === assessmentId ? "Publishing..." : "Publish Results"}
              </button>
              {hasAssessmentId ? (
                <Link
                  href={`/admin/assessments/${assessmentId}/edit`}
                  className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-200"
                >
                  Manage Questions
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-500">Manage Questions</span>
              )}
              {hasAssessmentId ? (
                <Link
                  href={`/admin/assessments/${assessmentId}/attempts`}
                  className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-yellow-700 transition-all hover:bg-yellow-100"
                >
                  View Attempts -&gt;
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-500">View Attempts</span>
              )}
              <button
                onClick={() => handleDeleteAssessment(assessmentId)}
                disabled={!hasAssessmentId || deletingAssessmentId === assessmentId}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
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
