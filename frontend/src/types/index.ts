export type Question = {
  id: number;
  question_text: string;
  question_type: "MCQ" | "DESCRIPTIVE";
  options?: { id: string; text: string }[];
  marks: number;
  section: string;
};

export type Assessment = {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  created_at: string;
};

export type Candidate = {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
};

export type Attempt = {
  id: number;
  user_id: number;
  assessment_id: number;
  score: number | null;
  status: "IN_PROGRESS" | "COMPLETED";
  start_time: string;
  end_time: string | null;
  user?: Candidate;
  assessment?: Assessment;
};

export type AnswerPayload = {
  questionId: number;
  answer: string;
};

