import { apiFetch } from "@/lib/api";
import { AnswerPayload } from "@/types";

export const attemptService = {
  start(assessmentCode: string, assessmentId?: number) {
    return apiFetch("/api/attempts/start", {
      method: "POST",
      body: JSON.stringify({ assessmentId, assessmentCode }),
    });
  },

  getQuestions(attemptId: number) {
    return apiFetch(`/api/attempts/${attemptId}/questions`);
  },

  saveAnswer(attemptId: number, payload: AnswerPayload) {
    return apiFetch(`/api/attempts/${attemptId}/answers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  submit(attemptId: number) {
    return apiFetch("/api/attempts/submit", {
      method: "POST",
      body: JSON.stringify({ attemptId }),
    });
  },
};
