"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/hooks/useAdmin";
import { getDashboardStats } from "@/services/admin.service";

export default function AdminPage() {
  const { loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState<any>(null);
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
    if (!adminLoading) {
      loadStats();
    }
  }, [adminLoading]);

  const handleExportPassed = () => {
    if (!stats?.recentResults) return;
    
    // In a real app, you might want a dedicated endpoint for ALL passed students cross-assessment
    // For now, we'll export the passed students from the recent results or provide a message
    const passed = stats.recentResults.filter((r: any) => r.result === "PASS");
    
    if (passed.length === 0) {
      alert("No passed candidates found in recent results to export.");
      return;
    }

    const headers = ["Email", "Name", "Assessment", "Score", "Result", "Date"];
    const csvContent = [
      headers.join(","),
      ...passed.map((r: any) => [
        r.email,
        r.full_name || "N/A",
        r.assessment_title,
        r.final_score,
        r.result,
        new Date(r.start_time).toLocaleDateString()
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

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Link
              href="/admin/assessments"
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-yellow-500/10"
            >
              Assessments
            </Link>
            <Link
              href="/admin/candidates"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/10"
            >
              Candidates
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Assessments" value={stats?.summary?.total_assessments} color="text-yellow-500" />
          <StatCard title="Total Candidates" value={stats?.summary?.total_candidates} color="text-blue-500" />
          <StatCard title="Total Pass" value={stats?.summary?.total_pass} color="text-green-500" />
          <StatCard title="Total Fail" value={stats?.summary?.total_fail} color="text-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assessment Breakdown */}
          <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-yellow-500">Assessment Breakdown</h2>
            <div className="space-y-4">
              {stats?.assessmentStats?.map((as: any) => (
                <div key={as.id} className="border-b border-neutral-800 pb-4 last:border-0">
                  <p className="font-medium text-gray-200 mb-2 truncate">{as.title}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Pass: {as.pass_count}</span>
                    <span className="text-red-400">Fail: {as.fail_count}</span>
                    <span className="text-gray-500">Total: {as.total_attempts}</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(as.pass_count / (as.total_attempts || 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${(as.fail_count / (as.total_attempts || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Results */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-yellow-500">Recent Results</h2>
              <button 
                onClick={handleExportPassed}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-gray-300 px-3 py-1.5 rounded border border-neutral-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Passed
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-800/50 text-gray-400 text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-3 font-bold">Candidate</th>
                    <th className="px-6 py-3 font-bold">Assessment</th>
                    <th className="px-6 py-3 font-bold">Score</th>
                    <th className="px-6 py-3 font-bold">Result</th>
                    <th className="px-6 py-3 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {stats?.recentResults?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent activity.</td>
                    </tr>
                  ) : (
                    stats?.recentResults?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{r.email}</p>
                          <p className="text-[10px] text-gray-500">{r.full_name || "-"}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-300 max-w-[150px] truncate">{r.assessment_title}</td>
                        <td className="px-6 py-4 text-sm font-mono">{r.final_score}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            r.result === "PASS" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {r.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 text-right">
                          {new Date(r.start_time).toLocaleDateString()}
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
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: any, color: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
    </div>
  );
}
