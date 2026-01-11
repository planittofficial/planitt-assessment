import { apiFetch } from "@/lib/api";

export const violationService = {
  log(attemptId: number, violationType: string) {
    return apiFetch("/api/violations/log", {
      method: "POST",
      body: JSON.stringify({ attemptId, violationType }),
    });
  },
};
