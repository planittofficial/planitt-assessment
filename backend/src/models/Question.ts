import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuestion extends Document {
  assessment_id: Types.ObjectId;
  question_text: string;
  question_type: "mcq" | "descriptive";
  options?: Record<string, string>;
  correct_answer?: string;
  section?: "Quantitative" | "Coding" | "Verbal" | "Logical";
  marks: number;
  created_at: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    assessment_id: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    question_text: {
      type: String,
      required: true,
    },
    question_type: {
      type: String,
      enum: ["mcq", "descriptive"],
      required: true,
    },
    options: mongoose.Schema.Types.Mixed,
    correct_answer: String,
    section: {
      type: String,
      enum: ["Quantitative", "Coding", "Verbal", "Logical"],
    },
    marks: {
      type: Number,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at" } }
);

questionSchema.index({ assessment_id: 1 });

export default mongoose.model<IQuestion>("Question", questionSchema);
