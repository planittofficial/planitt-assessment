import { apiFetch } from "@/lib/api";
import { AnswerPayload } from "@/types";

export const attemptService = {
  start(assessmentCode: string, assessmentId?: string) {
    return apiFetch("/api/attempts/start", {
      method: "POST",
      body: JSON.stringify({ assessmentId, assessmentCode }),
    });
  },

  getQuestions(attemptId: string) {
    return apiFetch(`/api/attempts/${attemptId}/questions`);
  },

  saveAnswer(attemptId: string, payload: AnswerPayload) {
    return apiFetch(`/api/attempts/${attemptId}/answers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  submit(attemptId: string) {
    return apiFetch("/api/attempts/submit", {
      method: "POST",
      body: JSON.stringify({ attemptId }),
    });
  },
};
