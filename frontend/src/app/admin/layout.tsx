"use client";

import { useAdmin } from "@/hooks/useAdmin";
import CandidateProfileMenu from "@/components/CandidateProfileMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAdmin();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-900 text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  const isMainDashboard = pathname === "/admin";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 py-4 px-8 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-xl font-bold text-yellow-500">
            Admin Panel
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link 
                href="/admin/assessments" 
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                  pathname.includes("/assessments")
                    ? "border-yellow-300 bg-yellow-100 text-yellow-800 shadow-sm"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Assessments
              </Link>
              <Link 
                href="/admin/candidates" 
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                  pathname.includes("/candidates")
                    ? "border-blue-300 bg-blue-100 text-blue-800 shadow-sm"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Candidates
              </Link>
              <Link 
                href="/admin/admins" 
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                  pathname.includes("/admins")
                    ? "border-violet-300 bg-violet-100 text-violet-800 shadow-sm"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Admins
              </Link>
            </div>
            <CandidateProfileMenu inline />
          </div>
        </div>
      </nav>
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
