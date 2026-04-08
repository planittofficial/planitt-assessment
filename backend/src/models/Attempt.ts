import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttempt extends Document {
  user_id: Types.ObjectId;
  assessment_id: Types.ObjectId;
  status: "started" | "completed" | "terminated";
  started_at: Date;
  submitted_at?: Date;
  auto_submitted: boolean;
  final_score?: number;
  is_published: boolean;
  result?: string;
  result_override?: string | null;
}

const attemptSchema = new Schema<IAttempt>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessment_id: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "completed", "terminated"],
      default: "started",
    },
    started_at: {
      type: Date,
      default: () => new Date(),
    },
    submitted_at: Date,
    auto_submitted: {
      type: Boolean,
      default: false,
    },
    final_score: Number,
    is_published: {
      type: Boolean,
      default: false,
    },
    result: String,
    result_override: {
      type: String,
      default: null,
    },
  }
);

attemptSchema.index({ user_id: 1, assessment_id: 1 });
attemptSchema.index({ user_id: 1 });
attemptSchema.index({ status: 1 });

export default mongoose.model<IAttempt>("Attempt", attemptSchema);
