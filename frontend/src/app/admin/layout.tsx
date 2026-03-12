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
  const isAssessmentsRoute = pathname === "/admin/assessments" || pathname.startsWith("/admin/assessments/");
  const isCandidatesRoute = pathname === "/admin/candidates" || pathname.startsWith("/admin/candidates/");
  const isAdminsRoute = pathname === "/admin/admins" || pathname.startsWith("/admin/admins/");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-stone-900 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-stone-900">
      <nav className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">
              Planitt Console
            </p>
            <Link href="/admin" className="mt-1 block text-2xl font-extrabold tracking-tight text-stone-950">
              Admin Panel
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 p-1 shadow-sm">
              <Link 
                href="/admin/assessments" 
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isAssessmentsRoute
                    ? "bg-[#f9e7d2] text-[#8b5224] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Assessments
              </Link>
              <Link 
                href="/admin/candidates" 
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isCandidatesRoute
                    ? "bg-[#e7f2ef] text-[#24593e] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Candidates
              </Link>
              <Link 
                href="/admin/admins" 
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isAdminsRoute
                    ? "bg-[#f2ebff] text-[#6844aa] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Admins
              </Link>
            </div>
            <CandidateProfileMenu inline />
          </div>
        </div>
      </nav>
      <main className="px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
