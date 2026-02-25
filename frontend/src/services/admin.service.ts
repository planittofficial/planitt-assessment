import { ApiError, apiFetch } from "@/lib/api";
import { Question } from "@/types";

export const getAssessments = () => {
  return apiFetch("/api/admin/assessments");
};

export const getAssessmentById = (assessmentId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}`);
};

export const getAssessmentQuestions = (assessmentId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/questions`);
};

export const getAttemptsByAssessment = (assessmentId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/attempts`);
};

export const getAttemptSummary = (attemptId: string | number) => {
  return apiFetch(`/api/admin/attempts/${attemptId}`);
};

export const getAttemptDetails = (attemptId: string | number) => {
  return apiFetch(`/api/admin/attempts/${attemptId}/details`);
};

export const getViolationsByAttempt = (attemptId: string | number) => {
  return apiFetch(`/api/admin/attempts/${attemptId}/violations`);
};

export const getDescriptiveAnswers = (attemptId: string | number) => {
  return apiFetch(`/api/admin/attempts/${attemptId}/descriptive`);
};

export const gradeDescriptiveAnswer = (payload: {
  answerId: string | number;
  marks: number;
}) => {
  return apiFetch("/api/admin/answers/grade", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const publishResult = (attemptId: string | number) => {
  return apiFetch(`/api/admin/attempts/${attemptId}/publish`, {
    method: "POST",
  });
};

export const deleteAttempt = async (
  attemptId: string | number,
  assessmentId?: string | number
) => {
  const requests: Array<() => Promise<any>> = [
    () =>
      apiFetch(`/api/admin/attempts/${attemptId}`, {
        method: "DELETE",
      }),
    () =>
      apiFetch(`/api/admin/attempts/${attemptId}/delete`, {
        method: "POST",
      }),
  ];

  if (assessmentId !== undefined) {
    requests.push(
      () =>
        apiFetch(`/api/admin/assessments/${assessmentId}/attempts/${attemptId}`, {
          method: "DELETE",
        }),
      () =>
        apiFetch(`/api/admin/assessments/${assessmentId}/attempts/${attemptId}/delete`, {
          method: "POST",
        })
    );
  }

  let lastError: unknown = null;
  for (const request of requests) {
    try {
      return await request();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Failed to delete attempt");
};

export const publishAllResults = (assessmentId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/publish-all`, {
    method: "POST",
  });
};

export const createAssessment = (payload: {
  title: string;
  duration_minutes: number;
  total_marks?: number;
  pass_percentage?: number;
}) => {
  return apiFetch("/api/admin/assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateAssessment = (
  assessmentId: string | number,
  payload: {
    title?: string;
    duration_minutes?: number;
    pass_percentage?: number;
    status?: string;
  }
) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const addQuestion = (
  assessmentId: string | number,
  payload: {
    question_text: string;
    question_type: "MCQ" | "DESCRIPTIVE";
    marks: number;
    correct_answer?: string;
    options?: string[];
  }
) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const bulkAddQuestions = (
  assessmentId: string | number,
  questions: Array<Record<string, unknown>>
) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/questions/bulk`, {
    method: "POST",
    body: JSON.stringify(questions),
  });
};

export const deleteQuestion = (assessmentId: string | number, questionId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/questions/${questionId}`, {
    method: "DELETE",
  });
};

export const deleteAllQuestions = (assessmentId: string | number) => {
  return apiFetch(`/api/admin/assessments/${assessmentId}/questions`, {
    method: "DELETE",
  });
};

export const getCandidates = () => {
  return apiFetch("/api/admin/candidates");
};

export const addCandidate = (payload: { email: string; full_name?: string }) => {
  return apiFetch("/api/admin/candidates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const bulkAddCandidates = (candidates: { email: string; full_name?: string }[]) => {
  return apiFetch("/api/admin/candidates/bulk", {
    method: "POST",
    body: JSON.stringify({ candidates }),
  });
};

export const deleteCandidate = (id: string | number) => {
  return apiFetch(`/api/admin/candidates/${id}`, {
    method: "DELETE",
  });
};

export const bulkDeleteCandidates = (ids: (string | number)[]) => {
  return apiFetch("/api/admin/candidates/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
};

export const getDashboardStats = () => {
  return apiFetch("/api/admin/dashboard-stats");
};

export const getAdmins = () => {
  return apiFetch("/api/admin/admins");
};

export const addAdmin = (payload: { email: string; full_name?: string }) => {
  return apiFetch("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const deleteAdmin = (id: string | number) => {
  return apiFetch(`/api/admin/admins/${id}`, {
    method: "DELETE",
  });
};
