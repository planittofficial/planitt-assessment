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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">
              Planitt Console
            </p>
            <Link href="/admin" className="mt-1 block text-xl font-extrabold tracking-tight text-stone-950 sm:text-2xl">
              Admin Panel
            </Link>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="custom-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/70 p-1 shadow-sm sm:w-auto sm:gap-2 sm:rounded-full">
              <Link 
                href="/admin/assessments" 
                className={`flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                  isAssessmentsRoute
                    ? "bg-[#f9e7d2] text-[#8b5224] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Assessments
              </Link>
              <Link 
                href="/admin/candidates" 
                className={`flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                  isCandidatesRoute
                    ? "bg-[#e7f2ef] text-[#24593e] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Candidates
              </Link>
              <Link 
                href="/admin/admins" 
                className={`flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm ${
                  isAdminsRoute
                    ? "bg-[#f2ebff] text-[#6844aa] shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                Admins
              </Link>
            </div>
            <div className="flex w-full justify-end sm:w-auto">
              <CandidateProfileMenu inline />
            </div>
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
