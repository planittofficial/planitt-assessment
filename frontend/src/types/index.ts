export type Question = {
  id: number;
  question_text: string;
  question_type: "MCQ" | "DESCRIPTIVE";
  options?: { id: string; text: string }[];
  marks: number;
};

export type AnswerPayload = {
  questionId: number;
  answer: string;
};
