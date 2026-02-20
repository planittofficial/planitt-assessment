"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { notifyError, notifySuccess } from "@/lib/notify";

type CandidateProfileMenuProps = {
  inline?: boolean;
};

export default function CandidateProfileMenu({ inline = false }: CandidateProfileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth(false);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fullName = (user?.full_name || "").trim();
  const email = user?.email || "";
  const displayName = fullName || email || "Candidate";
  const role = String(user?.role || "").toUpperCase();
  const isAdminRoute = pathname.startsWith("/admin");
  const roleBadge = isAdminRoute || role === "ADMIN" ? "A" : "C";

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
      notifySuccess("Logged out successfully.");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      notifyError("Failed to logout. Please try again.");
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  }

  // Hide on login page and when not authenticated yet.
  if (!user || pathname === "/login") return null;
  // On admin pages, we render inline manually to avoid overlap with admin action buttons.
  if (!inline && isAdminRoute) return null;

  return (
    <div
      className={inline ? "relative z-50" : "fixed right-6 top-6 z-50"}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-left shadow-lg shadow-gray-300/40 transition-all hover:bg-gray-100"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 font-bold text-black">
          {roleBadge}
        </span>
        <span className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
          {displayName}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 w-64 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-900">
              {fullName || (isAdminRoute ? "Admin" : "Candidate")}
            </p>
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

