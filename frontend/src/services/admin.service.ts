import { apiFetch } from "@/lib/api";

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
  answerId: number;
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
  questions: any[]
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

export const getDashboardStats = () => {
  return apiFetch("/api/admin/dashboard-stats");
};
