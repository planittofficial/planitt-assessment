import { apiFetch } from "@/lib/api";

export const authService = {
  login(email: string) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  me() {
    return apiFetch("/api/auth/me");
  },

  logout() {
    return apiFetch("/api/auth/logout", { method: "POST" });
  },
};
