"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssessment } from "@/services/admin.service";
import Link from "next/link";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    duration_minutes: 60,
    pass_percentage: 40,
    code: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createAssessment(formData);
      router.push(`/admin/assessments/${res.assessmentId}/edit`);
    } catch (err) {
      console.error(err);
      alert("Failed to create assessment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/assessments" className="text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to Assessments
        </Link>
        <h1 className="text-3xl font-bold mb-8">Create New Assessment</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 p-8 rounded-xl border border-neutral-800">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="e.g. Full Stack Developer Assessment"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Duration (Minutes)</label>
              <input
                required
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Assessment Code (Optional)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Auto-generated if empty"
                maxLength={10}
              />
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
              🏆 Pass/Fail Criteria
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pass Percentage (%)</label>
              <input
                required
                type="number"
                min="0"
                max="100"
                value={formData.pass_percentage}
                onChange={(e) => setFormData({ ...formData, pass_percentage: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Candidates must score at least this percentage of the total marks to pass.
              </p>
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Continue to Questions"}
          </button>
        </form>
      </div>
    </div>
  );
}
