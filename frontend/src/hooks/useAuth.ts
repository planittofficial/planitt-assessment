"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { usePathname, useRouter } from "next/navigation";

export function useAuth(requireAuth = false) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
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
