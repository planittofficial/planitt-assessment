"use client";

import { useAuth } from "./useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAdmin() {
  const { user, loading } = useAuth(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.push("/login");
    }
  }, [user, loading]);

  return { user, loading };
}
