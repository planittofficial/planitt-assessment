"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats } from "@/services/admin.service";
import { notifyInfo } from "@/lib/notify";

type DashboardSummary = {
  total_pass?: number;
  total_fail?: number;
  total_assessments?: number;
  total_candidates?: number;
};

type DashboardRecentResult = {
  id: string | number;
  email: string;
  full_name?: string;
  assessment_title: string;
  final_score: number | string;
  result: "PASS" | "FAIL" | string;
  started_at?: string;
  start_time?: string;
  submitted_at?: string;
  end_time?: string;
  created_at?: string;
};

type DashboardAssessmentStat = {
  id: string | number;
  title: string;
  pass_count: number;
  fail_count: number;
  total_attempts: number;
};

type DashboardStats = {
  summary?: DashboardSummary;
  recentResults?: DashboardRecentResult[];
  assessmentStats?: DashboardAssessmentStat[];
};

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalPass = Number(stats?.summary?.total_pass ?? 0);
  const totalFail = Number(stats?.summary?.total_fail ?? 0);
  const totalEvaluated = totalPass + totalFail;
  const passRate = totalEvaluated > 0 ? Math.round((totalPass / totalEvaluated) * 100) : 0;

  const handleExportPassed = () => {
    if (!stats?.recentResults) return;
    
    // In a real app, you might want a dedicated endpoint for ALL passed students cross-assessment
    // For now, we'll export the passed students from the recent results or provide a message
    const passed = stats.recentResults.filter((r) => r.result === "PASS");
    
    if (passed.length === 0) {
      notifyInfo("No passed candidates found in recent results to export.");
      return;
    }

    const headers = ["Email", "Name", "Assessment", "Score", "Result", "Date"];
    const csvContent = [
      headers.join(","),
      ...passed.map((r) => [
        r.email,
        r.full_name || "N/A",
        r.assessment_title,
        r.final_score,
        r.result,
        formatDateForUi(getBestDateValue(r))
      ].map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "all_passed_candidates_summary.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <p className="text-lg text-stone-900 animate-pulse">Loading dashboard statistics...</p>
      </div>
    );
  }

  return (
    <div className="hero-card relative min-h-screen overflow-hidden rounded-[2rem] p-4 sm:p-6 md:p-8">
      <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="relative z-10 mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-amber-300/70 bg-amber-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Admin Console
          </p>
          <h1 className="text-3xl font-black tracking-tight text-stone-950 md:text-4xl">Assessment Dashboard</h1>
          <p className="mt-2 text-sm text-stone-600">Monitor performance, review outcomes, and export passed candidates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/assessments"
            className="secondary-button rounded-xl px-3 py-2 text-xs"
          >
            Manage Assessments
          </Link>
          <Link
            href="/admin/candidates"
            className="secondary-button rounded-xl px-3 py-2 text-xs"
          >
            Candidates
          </Link>
          <Link
            href="/admin/admins"
            className="secondary-button rounded-xl px-3 py-2 text-xs"
          >
            Admins
          </Link>
        </div>
      </div>

      <div className="relative z-10 mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Pass Rate</p>
          <p className="mt-1 text-3xl font-black text-emerald-700">{passRate}%</p>
          <p className="mt-1 text-xs text-emerald-900/70">{totalPass} pass out of {totalEvaluated} evaluated attempts</p>
        </div>
        <div className="rounded-[1.5rem] border border-orange-200/70 bg-gradient-to-r from-orange-50 to-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700">Total Assessments</p>
          <p className="mt-1 text-3xl font-black text-orange-800">{stats?.summary?.total_assessments ?? 0}</p>
          <p className="mt-1 text-xs text-orange-900/70">Manage and monitor all assessment pipelines</p>
        </div>
        <div className="rounded-[1.5rem] border border-stone-200/80 bg-gradient-to-r from-stone-100 to-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700">Recent Results</p>
          <p className="mt-1 text-3xl font-black text-stone-800">{stats?.recentResults?.length ?? 0}</p>
          <p className="mt-1 text-xs text-stone-700/70">Latest candidate outcomes across assessments</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="relative z-10 mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Assessments" value={stats?.summary?.total_assessments} color="text-amber-600" icon="A" />
          <StatCard title="Total Candidates" value={stats?.summary?.total_candidates} color="text-sky-700" icon="C" />
          <StatCard title="Total Pass" value={stats?.summary?.total_pass} color="text-emerald-700" icon="P" />
          <StatCard title="Total Fail" value={stats?.summary?.total_fail} color="text-rose-700" icon="F" />
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Assessment Breakdown */}
          <div className="lg:col-span-1 rounded-[1.75rem] border border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/50 backdrop-blur">
            <h2 className="mb-6 text-xl font-bold text-[#c77131]">Assessment Breakdown</h2>
            <div className="space-y-4">
              {stats?.assessmentStats?.map((as) => (
                <div key={as.id} className="rounded-[1.25rem] border border-stone-200 bg-stone-50/70 p-4">
                  <p className="mb-2 truncate text-sm font-semibold text-stone-900">{as.title}</p>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-emerald-600">Pass: {as.pass_count}</span>
                    <span className="font-semibold text-rose-600">Fail: {as.fail_count}</span>
                    <span className="text-stone-500">Total: {as.total_attempts}</span>
                  </div>
                  <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(as.pass_count / (as.total_attempts || 1)) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-rose-500" 
                      style={{ width: `${(as.fail_count / (as.total_attempts || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Results */}
          <div className="lg:col-span-2 overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white/95 shadow-xl shadow-stone-200/50 backdrop-blur">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/70 p-6">
              <h2 className="text-xl font-bold text-[#c77131]">Recent Results</h2>
              <button 
                onClick={handleExportPassed}
                className="secondary-button flex items-center gap-2 rounded-xl border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Passed
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-600">
                    <th className="px-6 py-3 font-bold">Candidate</th>
                    <th className="px-6 py-3 font-bold">Assessment</th>
                    <th className="px-6 py-3 font-bold">Score</th>
                    <th className="px-6 py-3 font-bold">Result</th>
                    <th className="px-6 py-3 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {stats?.recentResults?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-stone-500">No recent activity.</td>
                    </tr>
                  ) : (
                    stats?.recentResults?.map((r) => (
                      <tr key={r.id} className="transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">{r.email}</p>
                          <p className="text-[10px] text-stone-500">{r.full_name || "-"}</p>
                        </td>
                        <td className="max-w-[150px] truncate px-6 py-4 text-xs text-stone-700">{r.assessment_title}</td>
                        <td className="px-6 py-4 text-sm font-mono font-semibold text-stone-900">{r.final_score}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            r.result === "PASS" ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-500/10 text-rose-700 ring-1 ring-rose-200"
                          }`}>
                            {r.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-stone-500">
                          {formatDateForUi(getBestDateValue(r))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  );
}

function getBestDateValue(row: DashboardRecentResult): string | null {
  return (
    row?.started_at ??
    row?.start_time ??
    row?.submitted_at ??
    row?.end_time ??
    row?.created_at ??
    null
  );
}

function formatDateForUi(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
}

function StatCard({ title, value, color, icon }: { title: string, value: number | string | undefined, color: string, icon: string }) {
  return (
    <div className="group rounded-[1.5rem] border border-stone-200/80 bg-white/90 p-6 shadow-lg shadow-stone-200/30 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">{title}</p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-[10px] font-extrabold text-stone-600">
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value ?? 0}</p>
    </div>
  );
}
