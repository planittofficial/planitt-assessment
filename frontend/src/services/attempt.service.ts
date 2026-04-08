import { apiFetch } from "@/lib/api";
import {
  AnswerPayload,
  AttemptQuestionsResponse,
  AttemptStartResponse,
  Question,
} from "@/types";

export const attemptService = {
  start(assessmentCode: string, assessmentId?: string): Promise<AttemptStartResponse> {
    return apiFetch("/api/attempts/start", {
      method: "POST",
      body: JSON.stringify({ assessmentId, assessmentCode }),
    });
  },

  async getQuestions(attemptId: string): Promise<AttemptQuestionsResponse> {
    const response = await apiFetch(`/api/attempts/${attemptId}/questions`);

    if (Array.isArray(response)) {
      return {
        questions: response as Question[],
        durationMinutes: 0,
      };
    }

    return response as AttemptQuestionsResponse;
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
