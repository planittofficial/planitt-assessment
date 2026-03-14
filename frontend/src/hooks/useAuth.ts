"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { usePathname, useRouter } from "next/navigation";
import { AuthUser } from "@/types";

export function useAuth(requireAuth = false) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Avoid noisy 401s on public pages when logged out.
      // If a route requires auth, we still check the session and redirect on failure.
      if (!requireAuth && !token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await authService.me();
        if (isMounted) {
          setUser(data);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          if (requireAuth) router.push("/login");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadUser();

    return () => {
      isMounted = false;
    };
  }, [pathname, requireAuth, router]);

  return { user, loading };
}
