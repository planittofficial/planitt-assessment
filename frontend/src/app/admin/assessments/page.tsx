"use client";

import { useEffect, useState } from "react";
import { getAssessments, publishAllResults } from "@/services/admin.service";
import Link from "next/link";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<string | number | null>(null);

  const loadAssessments = async () => {
    const data = await getAssessments();
    setAssessments(data);
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handlePublishAll = async (assessmentId: string | number) => {
    if (
      !confirm(
        "Are you sure you want to publish ALL finalized results for this assessment?"
      )
    )
      return;

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

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-black/40 transition-all hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Assessments</h1>
        <Link
          href="/admin/assessments/new"
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-yellow-500/10"
        >
          + Create Assessment
        </Link>
      </div>

      {assessments.map((a) => (
        <div
          key={a.id}
          className="p-4 border border-neutral-800 rounded mb-4 flex justify-between"
        >
          <div>
            <p className="font-semibold">{a.title}</p>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                Code: <span className="text-yellow-500 font-mono font-bold uppercase">{a.code}</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  String(a.status).toLowerCase() === "true" || String(a.status).toUpperCase() === "ACTIVE"
                    ? "text-green-400 border-green-500/30 bg-green-500/10"
                    : "text-red-400 border-red-500/30 bg-red-500/10"
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
              onClick={() => handlePublishAll(a.id)}
              disabled={publishingId === a.id}
              className="text-blue-400 hover:text-blue-300 text-sm font-semibold disabled:opacity-50"
            >
              {publishingId === a.id ? "Publishing..." : "Publish Results"}
            </button>
            <Link
              href={`/admin/assessments/${a.id}/edit`}
              className="text-gray-400 hover:text-white"
            >
              Manage Questions
            </Link>
            <Link
              href={`/admin/assessments/${a.id}/attempts`}
              className="text-yellow-400"
            >
              View Attempts →
            </Link>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
