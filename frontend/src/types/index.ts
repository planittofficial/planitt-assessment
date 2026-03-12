export type Question = {
  id: string;
  question_text: string;
  question_type: "MCQ" | "DESCRIPTIVE";
  options?: { id: string; text: string }[];
  correct_answer?: string;
  marks: number;
  section: string;
};

export type Assessment = {
  id: string;
  _id?: string;
  title: string;
  description: string;
  code?: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  status?: string | boolean;
  created_at: string;
};

export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
};

export type AuthUser = {
  id?: string;
  userId?: string;
  full_name?: string;
  email: string;
  role: "ADMIN" | "CANDIDATE" | string;
};

export type AuthLoginResponse = {
  role: AuthUser["role"];
  email?: string;
  full_name?: string;
};

export type Attempt = {
  id: string;
  user_id: string;
  assessment_id: string;
  score: number | null;
  status: "IN_PROGRESS" | "COMPLETED";
  start_time: string;
  end_time: string | null;
  user?: Candidate;
  assessment?: Assessment;
};

export type AnswerPayload = {
  questionId: string;
  answer: string;
};
