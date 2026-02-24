import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAnswer extends Document {
  attempt_id: Types.ObjectId;
  question_id: Types.ObjectId;
  answer_text?: string;
  marks_obtained: number;
  is_graded: boolean;
}

const answerSchema = new Schema<IAnswer>(
  {
    attempt_id: {
      type: Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
    },
    question_id: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    answer_text: String,
    marks_obtained: {
      type: Number,
      default: 0,
    },
    is_graded: {
      type: Boolean,
      default: false,
    },
  }
);

answerSchema.index({ attempt_id: 1 });
answerSchema.index({ question_id: 1 });

export default mongoose.model<IAnswer>("Answer", answerSchema);
